// BIZSIM RETAIL & COMMERCE — server (sumber kebenaran untuk katalog, stok, harga, pesanan, pemenuhan, refund, reward).
// Prinsip:
//  • Klien hanya mengirim id produk, variasi, jumlah, dan pilihan; harga, stok, ongkir, diskon, dan total dihitung di sini.
//  • Pembayaran (payment_status) dan pemenuhan (fulfillment_status) dipisah. Bayar berhasil ≠ barang siap/diterima.
//  • Jadwal tahap dibuat DETERMINISTIK saat pesanan dibuat (seed dari id pesanan); status dan progress selalu diturunkan dari
//    jadwal itu dan jam simulasi — tidak ada timer UI. Peristiwa dicatat malas (idempoten, UNIQUE(order, code)).
//  • Uang memakai fungsi inti keuangan (finance.cjs): PIN, limit, buku transaksi, uang tunai bernomor urut (fin_seq).
//  • Efek ke klien (inventori, kebutuhan, XP) lewat "grants" bernomor urut (shop_seq) sama seperti penyesuaian tunai,
//    sehingga reload/save lama tidak bisa menggandakan atau menghilangkan bonus.
// Ini simulasi game — bukan integrasi ke toko, kurir, atau pembayaran nyata.
const crypto = require('crypto');
const C = require('./shop-catalog.cjs');
const L = require('./life-catalog.cjs');

const DAY = 86_400, WARM = 14;
const ACTIVE = ['confirmed', 'preparing', 'processing', 'packed', 'handed_to_courier', 'in_transit', 'arriving'];
const AWAIT = ['delivered', 'ready_for_pickup'];
const TERMINAL = ['completed', 'cancelled', 'delivery_failed', 'returned'];
const RETURNING = ['return_requested'];
const mod = (a, n) => ((a % n) + n) % n;
const hf = (...p) => crypto.createHash('sha1').update(p.join('|')).digest().readUInt32BE(0) / 4294967296;
const between = (u, a, b) => a + u * (b - a);
const parse = (t, d = null) => { if (t == null || t === '') return d; try { return JSON.parse(t); } catch { return d; } };
const secOf = abs => mod(abs, DAY), dayOf = abs => Math.floor(abs / DAY) - WARM;
const hourOf = abs => secOf(abs) / 3600;
const nextHour = (abs, h) => { const base = abs - secOf(abs) + h * 3600; return base >= abs ? base : base + DAY; };
const fmtRp = n => 'Rp ' + Math.round(n).toLocaleString('id-ID');

module.exports = function mountCommerce(app, H, F) {
  const { db, tx: dbTx, vid, rid, now, fail, getPlayer, ageAt, eduInfo, eduMastery } = H;
  const { resolveMethod, debitSource, applyDebit, refund, checkPin, addTx, setResp, txRow, view: finView, idemOk, acct, absOf, hoursTxt, cashOf, cashApply, guard } = F;
  const STORE = id => C.STORES.find(s => s.id === id);
  const PROD = id => C.PRODUCTS.find(p => p.id === id);
  const FUL = mode => C.FULFILLMENT[mode];

  // ————————————————————————— skema —————————————————————————
  const SCHEMA = `
  CREATE TABLE IF NOT EXISTS shop_stock (visitor TEXT, product TEXT, qty INTEGER, day INTEGER, PRIMARY KEY (visitor, product));
  CREATE TABLE IF NOT EXISTS shop_orders (id TEXT PRIMARY KEY, visitor TEXT, idem TEXT, store TEXT, mode TEXT, lines TEXT, sub INTEGER, fees TEXT, discounts TEXT, total INTEGER,
    method TEXT, method_label TEXT, source TEXT, pay_status TEXT, ful_status TEXT, reason TEXT, tx_id TEXT, voucher_id TEXT, loc TEXT, ship TEXT,
    placed_abs INTEGER, eta_abs INTEGER, eta_orig_abs INTEGER, done_abs INTEGER, end_abs INTEGER, plan TEXT, ret TEXT, resp TEXT, created INTEGER, UNIQUE (visitor, idem));
  CREATE TABLE IF NOT EXISTS shop_events (order_id TEXT, code TEXT, at_abs INTEGER, label TEXT, detail TEXT, PRIMARY KEY (order_id, code));
  CREATE TABLE IF NOT EXISTS shop_notifs (id INTEGER PRIMARY KEY AUTOINCREMENT, visitor TEXT, order_id TEXT, kind TEXT, title TEXT, body TEXT, at_abs INTEGER, read INTEGER DEFAULT 0, toasted INTEGER DEFAULT 0, UNIQUE (order_id, kind));
  CREATE TABLE IF NOT EXISTS shop_rewards (id TEXT PRIMARY KEY, visitor TEXT, order_id TEXT, bonus_key TEXT, kind TEXT, label TEXT, amount REAL, payload TEXT, status TEXT, reason TEXT, source TEXT, at_abs INTEGER, created INTEGER, UNIQUE (order_id, bonus_key));
  CREATE TABLE IF NOT EXISTS shop_grants (visitor TEXT, seq INTEGER, kind TEXT, payload TEXT, reward_id TEXT, order_id TEXT, PRIMARY KEY (visitor, seq));
  CREATE TABLE IF NOT EXISTS shop_vouchers (id TEXT PRIMARY KEY, visitor TEXT, code TEXT, label TEXT, kind TEXT, value REAL, max_discount INTEGER, min_spend INTEGER, store TEXT, expires_abs INTEGER, status TEXT, source TEXT, used_order TEXT);
  CREATE TABLE IF NOT EXISTS shop_loyalty (visitor TEXT PRIMARY KEY, points INTEGER DEFAULT 0, done INTEGER DEFAULT 0);
  CREATE TABLE IF NOT EXISTS shop_once (visitor TEXT, key TEXT, PRIMARY KEY (visitor, key));`;
  function migrate() {
    db.exec(SCHEMA);
    try { db.exec('ALTER TABLE players ADD COLUMN shop_seq INTEGER DEFAULT 0'); } catch { /* sudah ada */ }
    for (const ix of ['CREATE INDEX IF NOT EXISTS ix_shop_orders_v ON shop_orders (visitor, placed_abs)', 'CREATE INDEX IF NOT EXISTS ix_shop_rewards_v ON shop_rewards (visitor, at_abs)',
      'CREATE INDEX IF NOT EXISTS ix_shop_notifs_v ON shop_notifs (visitor, id)', 'CREATE INDEX IF NOT EXISTS ix_shop_vouchers_v ON shop_vouchers (visitor, status)']) { try { db.exec(ix); } catch { /* opsional */ } }
  }

  // ————————————————————————— jam —————————————————————————
  function clockFrom(p, day, sec) {
    day = Number(day); sec = Number(sec);
    const row = db.prepare('SELECT clock_abs FROM players WHERE visitor=?').get(p.visitor) || {};
    if (!Number.isInteger(day) || day < 0 || !Number.isFinite(sec) || sec < 0 || sec >= DAY) return row.clock_abs != null ? { abs: Math.floor(row.clock_abs), day: dayOf(row.clock_abs), sec: secOf(row.clock_abs), fromSave: true } : { error: 'Jam simulasi tidak valid.' };
    const abs = absOf(day, Math.floor(sec));
    if (row.clock_abs != null && abs + 2 < row.clock_abs) return { error: 'Jam simulasi tertinggal dari save di server. Muat ulang halaman.' };
    return { abs, day, sec: Math.floor(sec) };
  }
  const clockPost = (req, p) => { const c = req.body?.clock || {}; return clockFrom(p, c.day, c.sec); };
  const clockGet = (req, p) => clockFrom(p, req.query.day, req.query.sec);
  const need = (req, res) => { const p = getPlayer(vid(req)); if (!p || !p.profile || !p.game) { fail(res, 'Profil atau save game belum ada.', 404); return null; } return p; };

  // ————————————————————————— stok —————————————————————————
  function stockRows(v) { const m = {}; for (const r of db.prepare('SELECT product, qty, day FROM shop_stock WHERE visitor=?').all(v)) m[r.product] = r; return m; }
  function virtualStock(p, row, day) {
    if (!p.stock) return null;
    if (!row) return { qty: p.stock.max, day };
    const steps = Math.max(0, Math.floor((day - row.day) / p.stock.refillDays));
    return { qty: Math.min(p.stock.max, row.qty + steps * p.stock.refillQty), day: row.day + steps * p.stock.refillDays };
  }
  // Pengurangan stok yang atomik: normalisasi baris, lalu UPDATE bersyarat (qty >= n).
  function reserveStock(v, p, n, day) {
    if (!p.stock) return true;
    const row = db.prepare('SELECT qty, day FROM shop_stock WHERE visitor=? AND product=?').get(v, p.id);
    const vs = virtualStock(p, row, day);
    db.prepare('INSERT INTO shop_stock (visitor, product, qty, day) VALUES (?,?,?,?) ON CONFLICT(visitor, product) DO UPDATE SET qty=excluded.qty, day=excluded.day').run(v, p.id, vs.qty, vs.day);
    const r = db.prepare('UPDATE shop_stock SET qty=qty-? WHERE visitor=? AND product=? AND qty>=?').run(n, v, p.id, n);
    return !!(r && r.changes);
  }
  function restock(v, p, n, day) {
    if (!p.stock) return;
    const row = db.prepare('SELECT qty, day FROM shop_stock WHERE visitor=? AND product=?').get(v, p.id);
    const vs = virtualStock(p, row, day);
    db.prepare('INSERT INTO shop_stock (visitor, product, qty, day) VALUES (?,?,?,?) ON CONFLICT(visitor, product) DO UPDATE SET qty=excluded.qty, day=excluded.day').run(v, p.id, Math.min(p.stock.max, vs.qty + n), vs.day);
  }

  // ————————————————————————— katalog publik —————————————————————————
  function bonusText(b) {
    const cond = [b.once === 'item' ? 'sekali per produk' : b.once === 'term' ? 'sekali per periode sekolah' : null, b.when?.minQty ? `min. ${b.when.minQty} buah` : null, b.minAge ? `usia ${b.minAge}+` : null].filter(Boolean).join(' · ');
    const main = b.kind === 'knowledge_xp' ? `+${b.amount} Knowledge XP` : b.kind === 'skill_xp' ? `+${b.amount} skill ${b.skill}` : b.kind === 'edu_mastery' ? `+${b.amount} penguasaan pelajaran (${b.subject === 'math' ? 'Matematika' : b.subject === 'indo' ? 'B. Indonesia' : b.subject})` : b.kind === 'need' ? (b.label || 'Pemulihan kebutuhan') : b.kind === 'item' ? (b.label || `Bonus ${PROD(b.item)?.name}`) : b.kind === 'voucher' ? (b.label || 'Voucher') : b.kind;
    return cond ? `${main} (${cond})` : main;
  }
  const publicProduct = (p, stockMap, day) => {
    const vs = p.stock ? virtualStock(p, stockMap[p.id], day) : null;
    return { id: p.id, store: p.store, name: p.name, desc: p.desc, type: p.type, use: p.use, mode: p.mode, price: p.price, variants: p.variants, quality: p.quality, rating: p.rating, prepMin: p.prepMin || 0, min: p.min || 0, fx: p.fx, minAge: p.minAge || null, returnable: p.returnable, origin: p.origin || null,
      stock: vs ? vs.qty : null, stockMax: p.stock?.max ?? null, stockLabel: p.stock?.label || 'stok', bonus: p.bonus.map(b => ({ key: b.key, kind: b.kind, text: bonusText(b) })) };
  };
  const publicStore = s => ({ id: s.id, name: s.name, channel: s.channel, cat: s.cat, blurb: s.blurb, rating: s.rating, ratingCount: s.ratingCount, modes: s.modes, hours: s.hours, days: s.days || null, hoursText: hoursTxt(s), methods: s.methods, pickupMethods: s.pickupMethods || null, origin: s.origin || null, travelMin: s.travelMin || 0, note: s.note || null });
  app.get('/api/shop/catalog', (req, res) => {
    const p = need(req, res); if (!p) return; const clk = clockGet(req, p); if (clk.error) return fail(res, clk.error);
    const sm = stockRows(p.visitor);
    res.json({ ok: true, stores: C.STORES.map(publicStore), products: C.PRODUCTS.map(x => publicProduct(x, sm, clk.day)), categories: C.CATEGORIES, fulfillment: C.FULFILLMENT, stageLabel: C.STAGE_LABEL, promos: C.PROMOS, rules: { maxQtyPerLine: C.RULES.maxQtyPerLine, codFee: C.RULES.codFee, returnWindowDays: C.RULES.returnWindowDays, parcel: C.RULES.parcel, foodDelivery: C.RULES.foodDelivery }, loyalty: C.LOYALTY, city: p.profile.city, cities: Object.keys(C.CITY_COORDS) });
  });

  // ————————————————————————— kutipan (quote) —————————————————————————
  const allowed = (p, store, mode) => p.store === store.id && (p.mode === mode || (store.id === 'serbamart' && ['counter', 'pickup'].includes(mode)));
  function promoEligible(pr, store, clk, age, sub) {
    if (pr.store && pr.store !== store.id) return false;
    if (pr.hours) { const h = clk.sec / 3600; if (h < pr.hours[0] || h >= pr.hours[1]) return false; }
    if (pr.days) { const wd = mod(clk.day + 1, 7); if (!pr.days.includes(wd)) return false; }
    if (pr.maxAge != null && age > pr.maxAge) return false;
    if (pr.minSpend && sub < pr.minSpend) return false;
    return true;
  }
  function quote(p, b, clk) {
    const v = p.visitor, store = STORE(b.store); if (!store) return { error: 'Toko tidak dikenal.' };
    const items = Array.isArray(b.items) ? b.items : [];
    if (!items.length) return { error: 'Keranjang kosong.' };
    if (items.length > C.RULES.maxLines) return { error: `Maksimal ${C.RULES.maxLines} jenis produk per pesanan.` };
    const age = ageAt(p.profile, clk.day), sm = stockRows(v);
    const lines = []; let sub = 0; const seen = new Set(); let totalQty = 0;
    let mode = b.mode;
    for (const r of items) {
      const pr = PROD(r.id); if (!pr || pr.store !== store.id) return { error: 'Produk tidak tersedia di toko ini.' };
      if (!mode) mode = pr.mode;
    }
    if (!store.modes.includes(mode)) return { error: `${store.name} tidak menyediakan jalur ${C.FULFILLMENT[mode]?.label || mode}.` };
    const fl = FUL(mode);
    for (const r of items) {
      const pr = PROD(r.id);
      if (!allowed(pr, store, mode)) return { error: `${pr.name} tidak dijual lewat jalur ${fl.label}. Pisahkan ke pesanan lain.` };
      const key = r.id + '|' + (r.variant || ''); if (seen.has(key)) return { error: 'Produk yang sama muncul dua kali — gabungkan jumlahnya.' }; seen.add(key);
      const qty = Math.floor(r.qty == null ? 1 : Number(r.qty)); if (!(qty >= 1) || qty > C.RULES.maxQtyPerLine) return { error: `Jumlah ${pr.name} harus 1–${C.RULES.maxQtyPerLine}.` };
      const vr = pr.variants.find(x => x.id === (r.variant || pr.variants[0].id)); if (!vr) return { error: `Variasi ${pr.name} tidak dikenal.` };
      if (pr.minAge && age < pr.minAge) return { error: `${pr.name} untuk usia ${pr.minAge} tahun ke atas (usia karakter: ${age}).` };
      const stockLeft = pr.stock ? virtualStock(pr, sm[pr.id], clk.day).qty : null;
      const sameProduct = lines.filter(l => l.id === pr.id).reduce((s, l) => s + l.qty, 0) + qty;
      if (stockLeft != null && sameProduct > stockLeft) return { error: stockLeft <= 0 ? `${pr.name} habis (${pr.stock.label || 'stok'} diisi ulang otomatis).` : `${pr.name}: ${pr.stock.label || 'stok'} tersisa ${stockLeft}, kamu memesan ${sameProduct}.` };
      const unit = pr.price + vr.price; if (unit < 0) return { error: 'Harga tidak valid.' };
      lines.push({ id: pr.id, name: pr.name + (pr.variants.length > 1 ? ` (${vr.label})` : ''), variant: vr.id, qty, price: unit, total: unit * qty });
      sub += unit * qty; totalQty += qty;
    }
    // jam buka & kecukupan waktu persiapan
    const open = F.openAt({ hours: store.hours, days: store.days }, clk.day, clk.sec);
    if (!open) return { error: `${store.name} tutup. Jam layanan ${hoursTxt(store)}.`, closed: true };
    const maxPrep = Math.max(...items.map(r => PROD(r.id).prepMin || 0));
    if (['counter', 'food', 'pickup'].includes(mode) && store.hours[1] < 24) {
      const closeAbs = absOf(clk.day, 0) + store.hours[1] * 3600;
      if (clk.abs + (maxPrep + 5) * 60 > closeAbs) return { error: `${store.name} tutup pukul ${store.hours[1]}:00 — waktu persiapan ${maxPrep} menit tidak cukup. Pesan lebih awal.` };
    }
    // lokasi & pengiriman
    const city = p.profile.city, fees = []; let km = 0, shipInfo = null;
    const loc = { id: 'home', label: 'Rumah', city };
    if (mode === 'food') { km = 1 + Math.floor(hf(v, store.id, 'km') * 7); }
    if (mode === 'parcel') {
      const origins = items.map(r => PROD(r.id).origin || store.origin || city); km = Math.max(...origins.map(o => C.distanceKm(o, city)));
      shipInfo = { origins: [...new Set(origins)] };
    }
    if (b.location && b.location !== 'home') return { error: 'Lokasi penerimaan tidak dikenal.' };
    const svc = C.RULES.service[mode] || 0; if (svc) fees.push({ code: 'service', label: 'Biaya layanan', amount: svc });
    let shippingIdx = -1; let shipOpt = null;
    if (mode === 'food') { shippingIdx = fees.length; fees.push({ code: 'shipping', label: `Ongkos kirim (${km} km)`, amount: C.RULES.foodDelivery.base + C.RULES.foodDelivery.perKm * km }); }
    if (mode === 'parcel') {
      shipOpt = b.ship === 'ekspres' ? 'ekspres' : 'reguler'; const R = C.RULES.parcel[shipOpt];
      shippingIdx = fees.length; fees.push({ code: 'shipping', label: `Ongkos kirim ${R.label}${km ? ` (${km} km)` : ' (satu kota)'}`, amount: Math.round((R.base + R.per100km * km / 100) / 500) * 500 });
    }
    const method = b.method;
    if (method === 'cod') {
      if (!['food', 'parcel'].includes(mode)) return { error: 'COD hanya untuk pesanan yang diantar.' };
      fees.push({ code: 'cod', label: 'Biaya COD', amount: C.RULES.codFee });
    }
    // promo otomatis + voucher (satu diskon harga terbaik; promo ongkir terpisah)
    const discounts = []; let discount = 0;
    const promos = C.PROMOS.filter(pr => promoEligible(pr, store, clk, age, sub));
    let bestPromo = null;
    for (const pr of promos.filter(x => x.kind !== 'shipping')) { const d = Math.min(sub, pr.kind === 'percent' ? Math.min(pr.max || Infinity, Math.round(sub * pr.value)) : pr.value); if (!bestPromo || d > bestPromo.d) bestPromo = { pr, d }; }
    if (bestPromo && bestPromo.d > 0) { discounts.push({ code: bestPromo.pr.id, label: bestPromo.pr.label, amount: -bestPromo.d, type: 'promo' }); discount += bestPromo.d; }
    const shipPromo = promos.find(x => x.kind === 'shipping');
    if (shipPromo && shippingIdx >= 0) { const a = fees[shippingIdx].amount; discounts.push({ code: shipPromo.id, label: shipPromo.label, amount: -a, type: 'promo' }); discount += a; }
    let voucher = null;
    if (b.voucher) {
      const vc = db.prepare('SELECT * FROM shop_vouchers WHERE id=? AND visitor=?').get(b.voucher, v);
      if (!vc) return { error: 'Voucher tidak ditemukan.' };
      if (vc.status !== 'available') return { error: 'Voucher sudah dipakai atau tidak berlaku.' };
      if (vc.expires_abs && clk.abs > vc.expires_abs) return { error: 'Voucher sudah kedaluwarsa.' };
      if (vc.store && vc.store !== store.id) return { error: `Voucher ini hanya untuk ${STORE(vc.store)?.name}.` };
      if (sub < vc.min_spend) return { error: `Voucher butuh belanja minimal ${fmtRp(vc.min_spend)}.` };
      const room = Math.max(0, sub - (bestPromo ? bestPromo.d : 0));
      const d = Math.min(room, vc.kind === 'percent' ? Math.min(vc.max_discount || Infinity, Math.round(sub * vc.value)) : vc.value);
      if (d > 0) { discounts.push({ code: vc.id, label: vc.label, amount: -d, type: 'voucher' }); discount += d; voucher = vc; }
    }
    const feeTotal = fees.reduce((s, f) => s + f.amount, 0);
    const total = Math.max(0, sub + feeTotal - discount);
    return { store, mode, fl, lines, sub, fees, discounts, discount, total, km, loc, ship: shipOpt, shipInfo, voucher, totalQty, maxPrep, age };
  }

  // ————————————————————————— jadwal pemenuhan (deterministik) —————————————————————————
  const DISRUPT = { food: ['Hujan deras — kurir melambat', 'Antrean dapur restoran sedang panjang', 'Jalan menuju alamatmu padat'], parcel: ['Antrean gudang ekspedisi padat', 'Cuaca buruk di jalur pengiriman', 'Volume paket tinggi di pusat sortir'] };
  const FAILURE = { food: 'Kurir mengalami kendala dan pesanan tidak dapat dikirim', parcel: 'Paket rusak/hilang di perjalanan' };
  function planOrder(q, abs, seed, { plain = false } = {}) {
    const u = k => plain ? 0.5 : hf(seed, k);
    const t0 = abs, mode = q.mode, st = q.store, stages = [['confirmed', t0]];
    const rush = C.RULES.rush.find(([a, b]) => hourOf(t0) >= a && hourOf(t0) < b)?.[2] || 1;
    const qtyF = 1 + 0.12 * Math.min(6, Math.max(0, q.totalQty - 1));
    let delay = null, failure = null, eta;
    const open = hr => Math.max(C.RULES.seller.open, Math.min(hr, C.RULES.seller.close));
    if (mode === 'counter' || mode === 'pickup') {
      const prepare = Math.round(q.maxPrep * 60 * qtyF * (mode === 'counter' ? rush : 1) * between(u('prep'), 0.85, 1.2)) + Math.round(between(u('queue'), 20, 90));
      const p1 = t0 + Math.round(between(u('ack'), 30, 75)); stages.push(['preparing', p1]); stages.push(['ready_for_pickup', p1 + Math.max(60, prepare)]); eta = stages[2][1];
    } else if (mode === 'food') {
      const p1 = t0 + Math.round(between(u('accept'), 90, 180)), prep = Math.round(q.maxPrep * 60 * qtyF * rush * between(u('prep'), 0.85, 1.25));
      const packed = p1 + prep, hand = packed + Math.round(between(u('courier'), 180, 480) * rush), ride = Math.round((q.km * between(u('ride'), 3, 4.5) + 5) * 60);
      const transit = hand + 60, deliver = transit + ride;
      stages.push(['preparing', p1], ['packed', packed], ['handed_to_courier', hand], ['in_transit', transit], ['arriving', deliver - 180], ['delivered', deliver]);
      eta = deliver;
      if (!plain && u('disrupt') < C.RULES.disruption.food) { const extra = Math.round(between(u('extra'), 600, 1200)); delay = { extra, notice: transit + Math.round(ride * 0.3), reason: DISRUPT.food[Math.floor(u('why') * 3)] }; }
      if (!plain && u('fail') < C.RULES.failure.food) failure = { reason: FAILURE.food };
    } else if (mode === 'parcel') {
      const procStart = (() => { const a = t0 + 120; const h = hourOf(a); return h >= C.RULES.seller.open && h < C.RULES.seller.close ? a : nextHour(a, C.RULES.seller.open); })();
      const dur = Math.round(between(u('proc'), 3600, 4 * 3600)), packedRaw = procStart + dur;
      const packed = (() => { const h = hourOf(packedRaw); return h < C.RULES.seller.close ? packedRaw : nextHour(packedRaw, C.RULES.seller.open) + 1800; })();
      const hand = nextHour(packed, C.RULES.courierPickupHour), transit = hand + 1800;
      const R = C.RULES.parcel[q.ship || 'reguler'];
      let days = q.km === 0 ? 1 : Math.ceil(q.km / 250) + 1; if (R.speed) days = Math.max(1, Math.ceil(days * R.speed));
      const win = C.RULES.deliverWindow, dhour = Math.floor(between(u('dh'), win[0], win[1] - 1)) + u('dm') * 0.9;
      const dDay = Math.floor(transit / DAY) + days, deliver = dDay * DAY + Math.round(dhour * 3600);
      const arriving = Math.max(transit + 3600, deliver - 3 * 3600);
      stages.push(['processing', procStart], ['packed', packed], ['handed_to_courier', hand], ['in_transit', transit], ['arriving', arriving], ['delivered', deliver]);
      eta = deliver;
      if (!plain && u('disrupt') < C.RULES.disruption.parcel) { const extra = Math.round(between(u('extra'), 12 * 3600, 24 * 3600)); delay = { extra, notice: transit + Math.round((deliver - transit) * 0.4), reason: DISRUPT.parcel[Math.floor(u('why') * 3)] }; }
      if (!plain && u('fail') < C.RULES.failure.parcel) failure = { reason: FAILURE.parcel };
    } else { // digital
      const p1 = t0 + 20, dl = p1 + Math.round(between(u('dig'), 60, 180)); stages.push(['processing', p1], ['delivered', dl]); eta = dl;
    }
    const etaOrig = eta;
    if (delay) for (const s of stages) if (s[1] >= delay.notice && ['arriving', 'delivered'].includes(s[0])) s[1] += delay.extra;
    const etaFinal = stages[stages.length - 1][1];
    if (failure) { const arr = stages.find(s => s[0] === 'arriving'); failure.at = arr ? arr[1] + 60 : etaFinal; stages.splice(stages.findIndex(s => s[0] === 'delivered'), 1); stages.push(['delivery_failed', failure.at]); }
    return { stages: stages.map(([code, at]) => ({ code, at })), etaOrig, etaFinal: delay ? etaFinal : etaOrig, delay, failure };
  }
  // Progress 0–100 dari tahap yang sudah lewat + fraksi waktu pada tahap berjalan.
  function progressOf(plan, nowAbs, ful) {
    const st = plan.stages.filter(s => s.code !== 'delivery_failed'); const n = st.length; if (n < 2) return 100;
    if (['delivered', 'ready_for_pickup', 'completed'].includes(ful)) return 100;
    let i = 0; for (let k = 0; k < n; k++) if (st[k].at <= nowAbs) i = k;
    if (i >= n - 1) return 100;
    const frac = Math.max(0, Math.min(1, (nowAbs - st[i].at) / Math.max(1, st[i + 1].at - st[i].at)));
    return Math.round(((i + frac) / (n - 1)) * 1000) / 10;
  }

  // ————————————————————————— peristiwa, notifikasi —————————————————————————
  const evIns = (oid, code, at, label, detail = null) => { const r = db.prepare('INSERT INTO shop_events (order_id, code, at_abs, label, detail) VALUES (?,?,?,?,?) ON CONFLICT(order_id, code) DO NOTHING').run(oid, code, Math.round(at), label, detail); return !!(r && r.changes); };
  function notify(v, oid, kind, title, body, at) { db.prepare('INSERT INTO shop_notifs (visitor, order_id, kind, title, body, at_abs) VALUES (?,?,?,?,?,?) ON CONFLICT(order_id, kind) DO NOTHING').run(v, oid, kind, title, body, Math.round(at)); }
  const stageLbl = code => C.STAGE_LABEL[code] || code;
  const NOTIF = { confirmed: ['Pembayaran berhasil', o => `${o.store_name}: pesanan ${o.id} dikonfirmasi.`], preparing: ['Pesanan mulai diproses', o => `${o.store_name} mulai menyiapkan pesananmu.`], processing: ['Pesanan mulai diproses', o => `${o.store_name} mulai memproses pesananmu.`],
    packed: ['Barang dikemas', o => `Pesanan ${o.id} sudah dikemas.`], handed_to_courier: ['Pesanan dikirim', o => `Pesanan ${o.id} diserahkan ke kurir.`], in_transit: ['Pesanan dalam perjalanan', o => `Pesanan ${o.id} sedang dikirim.`],
    arriving: ['Pesanan hampir tiba', o => `Kurir hampir tiba untuk pesanan ${o.id}.`], delivered: ['Pesanan tiba', o => o.mode === 'digital' ? `Akses produk digital pesanan ${o.id} tersedia.` : `Pesanan ${o.id} tiba. Konfirmasi penerimaan di Order Center.`], ready_for_pickup: ['Pesanan siap diambil', o => `Pesanan ${o.id} siap diambil di ${o.store_name}.`] };

  // ————————————————————————— refund & pemulihan —————————————————————————
  const srcOf = o => { const s = parse(o.source, {}); return s.type === 'cash' ? { type: 'cash' } : { type: 'acct', acct: acct(o.visitor, s.id) }; };
  function releaseVoucher(o, at) { if (o.voucher_id) { const vc = db.prepare('SELECT * FROM shop_vouchers WHERE id=?').get(o.voucher_id); if (vc && vc.status === 'used' && vc.used_order === o.id && !(vc.expires_abs && at > vc.expires_abs)) db.prepare("UPDATE shop_vouchers SET status='available', used_order=NULL WHERE id=?").run(vc.id); } }
  function restockOrder(o, day) { for (const l of parse(o.lines, [])) { const pr = PROD(l.id); if (pr) restock(o.visitor, pr, l.qty, day); } }
  function voidRewards(oid, reason) { db.prepare("UPDATE shop_rewards SET status='void', reason=? WHERE order_id=? AND status='pending'").run(reason, oid); }
  // Mengembalikan dana ke sumber pembayaran dan mencatat transaksi reversal. Tidak menghapus riwayat pembelian.
  function refundPayment(p, o, amount, at, label, full) {
    const out = { adj: null };
    if (o.pay_status !== 'paid' || amount <= 0) return out;
    const src = srcOf(o), day = dayOf(at), sec = secOf(at);
    const rt = addTx(o.visitor, { kind: 'reversal', status: 'berhasil', amount, method: o.method, dst: src.type === 'cash' ? 'cash' : src.acct?.id, merchant: o.store, label, reversal_of: o.tx_id, day, sec });
    if (src.type === 'acct' && !src.acct) throw new Error('Rekening sumber pembayaran tidak ditemukan.');
    out.adj = refund(p, src, amount, 'refund', `Pengembalian dana pesanan ${o.id}`, rt);
    if (full) db.prepare("UPDATE fin_tx SET status='reversed' WHERE id=?").run(o.tx_id);
    db.prepare('UPDATE shop_orders SET pay_status=? WHERE id=?').run(full ? 'refunded' : 'partially_refunded', o.id);
    return out;
  }

  // ————————————————————————— tick: materialisasi peristiwa sampai jam simulasi —————————————————————————
  function tickOrder(p, row, nowAbs) {
    const o = { ...row, store_name: STORE(row.store)?.name || row.store }; const v = p.visitor;
    const plan = parse(o.plan, null); if (!plan) return;
    dbTx(() => {
      let cur = db.prepare('SELECT * FROM shop_orders WHERE id=?').get(o.id); if (!cur || !ACTIVE.concat(RETURNING).includes(cur.ful_status)) return;
      if (ACTIVE.includes(cur.ful_status)) {
        for (const s of plan.stages) {
          if (s.at > nowAbs) break;
          if (s.code === 'delivery_failed') {
            if (!evIns(o.id, 'delivery_failed', s.at, 'Pengiriman gagal', plan.failure?.reason)) continue;
            const r = refundPayment(p, { ...cur, visitor: v }, cur.total, s.at, `Pengembalian dana: pengiriman gagal (${o.id})`, true);
            if (cur.pay_status === 'cod_pending') { db.prepare("UPDATE fin_tx SET status='gagal', reason=? WHERE id=?").run('Pengiriman gagal — tidak ada pembayaran tunai', cur.tx_id); db.prepare("UPDATE shop_orders SET pay_status='cancelled' WHERE id=?").run(o.id); }
            db.prepare("UPDATE shop_orders SET ful_status='delivery_failed', reason=?, end_abs=? WHERE id=?").run(plan.failure?.reason || 'Pengiriman gagal', s.at, o.id);
            restockOrder(cur, dayOf(s.at)); releaseVoucher(cur, s.at); voidRewards(o.id, 'Pesanan gagal dikirim');
            notify(v, o.id, 'failed', 'Pengiriman gagal', `${plan.failure?.reason}. Dana ${fmtRp(cur.total)} dikembalikan ke sumber pembayaran.`, s.at);
            return;
          }
          if (evIns(o.id, s.code, s.at, stageLbl(s.code), null)) {
            db.prepare('UPDATE shop_orders SET ful_status=? WHERE id=?').run(s.code, o.id);
            const nf = NOTIF[s.code]; if (nf && FUL(o.mode).notify.includes(s.code)) notify(v, o.id, s.code, nf[0], nf[1](o), s.at);
          }
        }
        if (plan.delay && plan.delay.notice <= nowAbs && evIns(o.id, 'eta_changed', plan.delay.notice, 'Estimasi tiba berubah', plan.delay.reason)) {
          db.prepare('UPDATE shop_orders SET eta_abs=? WHERE id=?').run(plan.etaFinal, o.id);
          notify(v, o.id, 'eta', 'Estimasi tiba berubah', `${plan.delay.reason}. Estimasi baru lebih lambat ±${Math.round(plan.delay.extra / 60)} menit.`, plan.delay.notice);
        }
      } else if (cur.ful_status === 'return_requested') {
        const ret = parse(cur.ret, null); if (!ret) return;
        for (const s of ret.stages) {
          if (s.at > nowAbs) break;
          if (s.code === 'ret_pickup') { if (evIns(o.id, 'ret_pickup', s.at, 'Kurir mengambil barang retur')) notify(v, o.id, 'ret_pickup', 'Barang retur diambil kurir', `Retur pesanan ${o.id} sedang dikirim ke penjual.`, s.at); }
          if (s.code === 'ret_received') { if (evIns(o.id, 'ret_received', s.at, 'Penjual menerima barang retur')) { db.prepare("UPDATE shop_orders SET ful_status='returned', end_abs=? WHERE id=?").run(s.at, o.id); restockOrder(cur, dayOf(s.at)); voidRewards(o.id, 'Barang dikembalikan'); releaseVoucher(cur, s.at); cur = db.prepare('SELECT * FROM shop_orders WHERE id=?').get(o.id); } }
          if (s.code === 'ret_refund') { if (evIns(o.id, 'ret_refund', s.at, 'Refund diproses', `${fmtRp(ret.amount)} dikembalikan`)) { refundPayment(p, cur, ret.amount, s.at, `Refund retur pesanan ${o.id}`, ret.amount >= cur.total); notify(v, o.id, 'refund', 'Refund selesai', `${fmtRp(ret.amount)} dikembalikan ke sumber pembayaran untuk pesanan ${o.id}.`, s.at); } }
        }
      }
    })();
  }
  function tickAll(p, nowAbs) {
    const rows = db.prepare(`SELECT * FROM shop_orders WHERE visitor=? AND ful_status IN (${ACTIVE.concat(RETURNING).map(() => '?').join(',')})`).all(p.visitor, ...ACTIVE, ...RETURNING);
    for (const r of rows) tickOrder(p, r, nowAbs);
    return rows.length;
  }

  // ————————————————————————— output pesanan —————————————————————————
  function orderOut(o, nowAbs, full = false) {
    const fl = FUL(o.mode), plan = parse(o.plan, null), lines = parse(o.lines, []);
    const events = db.prepare('SELECT code, at_abs, label, detail FROM shop_events WHERE order_id=? ORDER BY at_abs, rowid').all(o.id).map(e => ({ code: e.code, at: e.at_abs, label: e.label, detail: e.detail }));
    const done = new Set(events.map(e => e.code)), ful = o.ful_status;
    const flow = fl.stages.map(([c, l]) => c);
    const cancelled = ['cancelled', 'delivery_failed'].includes(ful), returning = ['return_requested', 'returned'].includes(ful);
    const idx = Math.max(-1, ...flow.map((c, k) => done.has(c) ? k : -1));
    const stages = fl.stages.map(([c, l], k) => ({ code: c, label: l, state: ful === 'completed' ? 'done' : done.has(c) ? (k === idx && !cancelled && !returning && !AWAIT.includes(ful) ? 'current' : 'done') : 'todo' }));
    let progress = plan ? progressOf(plan, Math.min(nowAbs, o.end_abs || nowAbs), ful) : 0;
    if (ful === 'completed') progress = 100; if (cancelled || (returning && ful !== 'completed')) progress = cancelled ? progress : 100;
    const can = cancelReason(o, nowAbs), ret = returnReason(o, nowAbs);
    const bonusRows = full ? db.prepare('SELECT id, kind, label, status, reason, amount FROM shop_rewards WHERE order_id=? ORDER BY created').all(o.id) : undefined;
    return { id: o.id, store: o.store, storeName: STORE(o.store)?.name, mode: o.mode, modeLabel: fl.label, where: fl.where, lines, sub: o.sub, fees: parse(o.fees, []), discounts: parse(o.discounts, []), total: o.total, method: o.method, methodLabel: o.method_label,
      payStatus: o.pay_status, fulStatus: ful, fulLabel: C.STAGE_LABEL[ful] || ful, reason: o.reason, progress, stages, eta: o.eta_abs, etaOrig: o.eta_orig_abs, etaChanged: o.eta_abs !== o.eta_orig_abs && done.has('eta_changed'), placedAbs: o.placed_abs, doneAbs: o.done_abs, endAbs: o.end_abs,
      loc: parse(o.loc, null), ship: o.ship, canCancel: can.ok, cancelWhy: can.ok ? null : can.why, canClaim: AWAIT.includes(ful), claimLabel: fl.claimLabel, claimNote: AWAIT.includes(ful) && o.pay_status === 'cod_pending' ? `Siapkan uang tunai ${fmtRp(o.total)} (COD).` : null,
      canReturn: ret.ok, returnWhy: ret.ok ? null : ret.why, events: full ? events : undefined, rewards: bonusRows, txId: o.tx_id };
  }
  function cancelReason(o, nowAbs) {
    const fl = FUL(o.mode), f = o.ful_status;
    if (f === 'cancelled') return { ok: false, why: 'Pesanan sudah dibatalkan.' };
    if (TERMINAL.includes(f) || RETURNING.includes(f)) return { ok: false, why: f === 'completed' ? 'Pesanan sudah selesai. Pembelian yang sudah diterima tidak dapat dibatalkan.' : 'Pesanan sudah ditutup.' };
    if (AWAIT.includes(f)) return { ok: false, why: o.mode === 'digital' ? 'Produk digital yang sudah dikirim tidak dapat dibatalkan.' : 'Pesanan sudah tiba/siap — konfirmasi penerimaan, atau ajukan retur bila memenuhi syarat.' };
    if (fl.cancelable.includes(f)) return { ok: true };
    const why = { preparing: 'Makanan/pesanan sudah mulai disiapkan — tidak dapat dibatalkan.', processing: 'Penjual sudah memproses pesanan.', packed: 'Pesanan sudah dikemas — tidak dapat dibatalkan.', handed_to_courier: 'Pesanan sudah diserahkan ke kurir.', in_transit: 'Pesanan sedang dalam perjalanan — tidak dapat dibatalkan.', arriving: 'Kurir hampir tiba — tidak dapat dibatalkan.' }[f];
    return { ok: false, why: why || 'Pesanan tidak dapat dibatalkan pada tahap ini.' };
  }
  function returnReason(o, nowAbs) {
    if (o.ful_status !== 'delivered') return { ok: false, why: o.ful_status === 'completed' ? 'Barang yang sudah diterima/dipakai tidak dapat dikembalikan.' : 'Retur hanya bisa diajukan setelah paket tiba dan sebelum dikonfirmasi diterima.' };
    if (o.mode !== 'parcel') return { ok: false, why: 'Hanya paket yang dikirim kurir yang dapat dikembalikan.' };
    const lines = parse(o.lines, []); const bad = lines.find(l => !PROD(l.id)?.returnable);
    if (bad) return { ok: false, why: `${bad.name} termasuk barang yang tidak dapat dikembalikan.` };
    const dl = db.prepare("SELECT at_abs FROM shop_events WHERE order_id=? AND code='delivered'").get(o.id);
    if (dl && nowAbs > dl.at_abs + C.RULES.returnWindowDays * DAY) return { ok: false, why: `Batas retur ${C.RULES.returnWindowDays} hari setelah tiba sudah lewat.` };
    return { ok: true };
  }

  // ————————————————————————— reward & grant —————————————————————————
  const claimSeq = v => { const r = db.prepare('SELECT shop_seq FROM players WHERE visitor=?').get(v) || {}; return (r.shop_seq || 0); };
  function addGrant(v, kind, payload, rewardId, oid) {
    const seq = claimSeq(v) + 1;
    db.prepare('UPDATE players SET shop_seq=? WHERE visitor=?').run(seq, v);
    db.prepare('INSERT INTO shop_grants (visitor, seq, kind, payload, reward_id, order_id) VALUES (?,?,?,?,?,?)').run(v, seq, kind, JSON.stringify(payload), rewardId || null, oid || null);
    return { seq, kind, ...payload };
  }
  function pendingRewards(p, q, oid, at, srcLabel) {
    const edu = eduInfo(p); const v = p.visitor;
    for (const l of q.lines) {
      const pr = PROD(l.id);
      for (const b of pr.bonus) {
        const key = `${pr.id}:${b.key}`; let status = 'pending', reason = 'Menunggu pesanan diterima';
        const qtyOK = !b.when?.minQty || l.qty >= b.when.minQty;
        if (!qtyOK) { status = 'ineligible'; reason = `Syarat: minimal ${b.when.minQty} buah (kamu: ${l.qty})`; }
        else if (b.minAge && q.age < b.minAge) { status = 'ineligible'; reason = `Syarat usia ${b.minAge}+`; }
        else if (b.once === 'item' && db.prepare('SELECT 1 FROM shop_once WHERE visitor=? AND key=?').get(v, `bonus:${pr.id}:${b.key}`)) { status = 'ineligible'; reason = 'Bonus produk ini sudah pernah diterima'; }
        else if (b.kind === 'edu_mastery' && !(edu.enrolled && edu.subjects.includes(b.subject))) { status = 'ineligible'; reason = 'Butuh sedang bersekolah dengan mata pelajaran terkait'; }
        const label = b.kind === 'item' ? (b.label || `Bonus ${PROD(b.item)?.name}`) : b.kind === 'voucher' ? (b.label || 'Voucher') : bonusText({ ...b, once: null, when: null });
        db.prepare('INSERT INTO shop_rewards (id, visitor, order_id, bonus_key, kind, label, amount, payload, status, reason, source, at_abs, created) VALUES (?,?,?,?,?,?,?,?,?,?,?,?,?) ON CONFLICT(order_id, bonus_key) DO NOTHING')
          .run(rid('rw'), v, oid, key, b.kind, label, b.amount ?? b.qty ?? 0, JSON.stringify({ ...b, product: pr.id, qty: l.qty }), status, reason, srcLabel, Math.round(at), now());
      }
    }
  }
  function receiveReward(v, oid, rw, at, applyFn) {
    // Menetapkan status "diterima" hanya sekali (UPDATE bersyarat) — mencegah bonus ganda.
    const r = db.prepare("UPDATE shop_rewards SET status='received', reason=NULL, at_abs=? WHERE id=? AND status='pending'").run(Math.round(at), rw.id);
    if (!r || !r.changes) return null; return applyFn();
  }
  function grantVoucher(v, code, at, source) {
    const d = C.VOUCHERS[code]; if (!d) return null; const id = rid('vc');
    db.prepare("INSERT INTO shop_vouchers (id, visitor, code, label, kind, value, max_discount, min_spend, store, expires_abs, status, source, used_order) VALUES (?,?,?,?,?,?,?,?,?,?,'available',?,NULL)").run(id, v, code, d.label, d.kind, d.value, d.max, d.minSpend, d.store, Math.round(at + d.validDays * DAY), source);
    return id;
  }
  function addSystemReward(v, oid, key, kind, label, source, at, amount = 0) {
    const r = db.prepare("INSERT INTO shop_rewards (id, visitor, order_id, bonus_key, kind, label, amount, payload, status, reason, source, at_abs, created) VALUES (?,?,?,?,?,?,?,?,'received',NULL,?,?,?) ON CONFLICT(order_id, bonus_key) DO NOTHING").run(rid('rw'), v, oid, key, kind, label, amount, '{}', source, Math.round(at), now());
    return !!(r && r.changes);
  }
  const loyalty = v => db.prepare('SELECT points, done FROM shop_loyalty WHERE visitor=?').get(v) || { points: 0, done: 0 };
  function stat(v) {
    const done = db.prepare("SELECT lines, store, discounts FROM shop_orders WHERE visitor=? AND ful_status='completed'").all(v);
    let learn = 0, online = 0, discounted = 0;
    for (const o of done) { const lines = parse(o.lines, []); learn += lines.filter(l => ['learn'].includes(PROD(l.id)?.use) && ['buku', 'digital'].includes(PROD(l.id)?.type)).length; if (STORE(o.store)?.channel === 'online') online++; if (parse(o.discounts, []).length) discounted++; }
    return { completed: done.length, learn, online, discounted };
  }

  // ————————————————————————— checkout —————————————————————————
  const methodFacade = (store, mode) => ({ id: store.id, name: store.name, methods: mode === 'pickup' && store.pickupMethods ? store.pickupMethods : store.methods });
  app.post('/api/shop/quote', (req, res) => {
    const p = need(req, res); if (!p) return; const clk = clockPost(req, p); if (clk.error) return fail(res, clk.error);
    const q = quote(p, req.body, clk); if (q.error) return res.status(400).json({ ok: false, error: q.error, closed: !!q.closed });
    const plan = planOrder(q, clk.abs, 'est', { plain: true });
    res.json({ ok: true, store: q.store.id, mode: q.mode, modeLabel: q.fl.label, lines: q.lines, sub: q.sub, fees: q.fees, discounts: q.discounts, total: q.total, km: q.km, loc: q.loc, ship: q.ship, etaEstimate: plan.etaOrig, etaSeconds: plan.etaOrig - clk.abs, minutes: Math.round((plan.etaOrig - clk.abs) / 60),
      methods: methodFacade(q.store, q.mode).methods, where: q.fl.where, claimLabel: q.fl.claimLabel,
      vouchers: db.prepare("SELECT id, label, kind, value, max_discount AS max, min_spend AS minSpend, store, expires_abs AS expires FROM shop_vouchers WHERE visitor=? AND status='available'").all(p.visitor).filter(x => !(x.expires && clk.abs > x.expires)) });
  });

  app.post('/api/shop/checkout', guard((req, res) => {
    const p = need(req, res); if (!p) return; const b = req.body || {}, v = p.visitor;
    if (!idemOk(b.idem)) return fail(res, 'Kunci transaksi tidak valid.');
    const dup = db.prepare('SELECT resp FROM shop_orders WHERE visitor=? AND idem=?').get(v, b.idem); if (dup?.resp) return res.json({ ...parse(dup.resp, {}), duplicate: true });
    const clk = clockPost(req, p); if (clk.error) return fail(res, clk.error);
    const active = db.prepare(`SELECT COUNT(*) AS n FROM shop_orders WHERE visitor=? AND ful_status IN (${ACTIVE.concat(AWAIT).map(() => '?').join(',')})`).get(v, ...ACTIVE, ...AWAIT);
    if (active && active.n >= 15) return fail(res, 'Terlalu banyak pesanan aktif (maks. 15). Selesaikan atau terima pesanan sebelumnya.');
    const q = quote(p, b, clk); if (q.error) return fail(res, q.error);
    if (q.total === 0 && q.sub > 0 && false) return fail(res, 'Total tidak valid.');
    const store = q.store, fm = methodFacade(store, q.mode);
    const src = resolveMethod(v, fm, b.method, b.source); if (src.error) return fail(res, src.error);
    const ad = parse(F.st(v).autodebit, {}); void ad;
    if (src.type === 'acct') { const pe = checkPin(v, b.pin); if (pe) return fail(res, pe); }
    const oid = rid('ord'), label = `${store.name}: ${q.lines.map(l => `${l.qty}× ${l.name}`).join(', ')}`;
    const srcJson = JSON.stringify(src.type === 'cash' ? { type: 'cash' } : { type: 'acct', id: src.acct.id });
    let out;
    dbTx(() => {
      const failRecord = reason => {
        const t = addTx(v, { idem: b.idem, kind: 'belanja', status: 'gagal', amount: -q.total, method: b.method, src: src.type === 'cash' ? 'cash' : src.acct.id, merchant: store.id, label, reason, day: clk.day, sec: clk.sec });
        db.prepare("INSERT INTO shop_orders (id, visitor, idem, store, mode, lines, sub, fees, discounts, total, method, method_label, source, pay_status, ful_status, reason, tx_id, voucher_id, loc, ship, placed_abs, eta_abs, eta_orig_abs, done_abs, end_abs, plan, ret, resp, created) VALUES (?,?,?,?,?,?,?,?,?,?,?,?,?,'failed','cancelled',?,?,NULL,?,?,?,NULL,NULL,NULL,?,NULL,NULL,NULL,?)")
          .run(oid, v, b.idem, store.id, q.mode, JSON.stringify(q.lines), q.sub, JSON.stringify(q.fees), JSON.stringify(q.discounts), q.total, b.method, src.label, srcJson, reason, t, JSON.stringify(q.loc), q.ship, clk.abs, clk.abs, now());
        evIns(oid, 'payment_failed', clk.abs, 'Pembayaran gagal', reason);
        out = { ...finView(p, clk.abs), ok: false, error: reason, order: orderOut(db.prepare('SELECT * FROM shop_orders WHERE id=?').get(oid), clk.abs, true), txn: txRow(t), cashAdj: [] };
        db.prepare('UPDATE shop_orders SET resp=? WHERE id=?').run(JSON.stringify(out), oid); setResp(t, out);
      };
      const cod = !!src.cod;
      if (!cod) { const err = debitSource(p, src, q.total, clk, src.kind); if (err) return failRecord(err); }
      for (const l of q.lines) { const pr = PROD(l.id); const n = q.lines.filter(x => x.id === l.id).reduce((s, x) => s + x.qty, 0); if (l === q.lines.find(x => x.id === l.id) && !reserveStock(v, pr, n, clk.day)) throw Object.assign(new Error('stok'), { stock: pr.name }); }
      const plan = planOrder(q, clk.abs, oid);
      const t = addTx(v, { idem: b.idem, kind: 'belanja', status: cod ? 'pending' : 'berhasil', amount: -q.total, method: cod ? 'cod' : (src.kind || b.method), src: src.type === 'cash' ? 'cash' : src.acct.id, merchant: store.id, label: cod ? label : `${label} · ${src.label}`, reason: cod ? 'Dibayar tunai saat pesanan diterima' : null, day: clk.day, sec: clk.sec });
      db.prepare("INSERT INTO shop_orders (id, visitor, idem, store, mode, lines, sub, fees, discounts, total, method, method_label, source, pay_status, ful_status, reason, tx_id, voucher_id, loc, ship, placed_abs, eta_abs, eta_orig_abs, done_abs, end_abs, plan, ret, resp, created) VALUES (?,?,?,?,?,?,?,?,?,?,?,?,?,?,'confirmed',NULL,?,?,?,?,?,?,?,NULL,NULL,?,NULL,NULL,?)")
        .run(oid, v, b.idem, store.id, q.mode, JSON.stringify(q.lines), q.sub, JSON.stringify(q.fees), JSON.stringify(q.discounts), q.total, cod ? 'cod' : (src.kind || b.method), cod ? 'Bayar di tempat (COD)' : src.label, srcJson, cod ? 'cod_pending' : 'paid', t, q.voucher?.id || null, JSON.stringify(q.loc), q.ship, clk.abs, plan.etaOrig, plan.etaOrig, JSON.stringify(plan), now());
      evIns(oid, 'confirmed', clk.abs, stageLbl('confirmed'), `Total ${fmtRp(q.total)}`); evIns(oid, cod ? 'cod_selected' : 'payment_confirmed', clk.abs, cod ? 'Metode COD dipilih — bayar saat diterima' : 'Pembayaran dikonfirmasi', cod ? null : src.label);
      if (q.voucher) db.prepare("UPDATE shop_vouchers SET status='used', used_order=? WHERE id=? AND status='available'").run(oid, q.voucher.id);
      let adj = null; if (!cod) adj = applyDebit(p, src, q.total, clk, src.kind, store.legacyCat === 'minimarket' ? 'belanja' : store.legacyCat === 'kesehatan' ? 'kesehatan' : store.legacyCat === 'hiburan' ? 'hiburan' : (store.cat === 'sekolah' || store.cat === 'marketplace') ? 'belanja' : 'makan', label, t);
      pendingRewards(p, q, oid, clk.abs, `${store.name} · ${oid}`);
      notify(v, oid, 'paid', cod ? 'Pesanan dibuat (COD)' : 'Pembayaran berhasil', cod ? `${label}. Bayar tunai saat pesanan diterima.` : `${fmtRp(q.total)} dibayar lewat ${src.label}.`, clk.abs);
      const row = db.prepare('SELECT * FROM shop_orders WHERE id=?').get(oid);
      out = { ...finView(p, clk.abs), ok: true, order: orderOut(row, clk.abs, true), txn: txRow(t), msg: cod ? `Pesanan dibuat. Siapkan uang tunai ${fmtRp(q.total)} saat pesanan tiba.` : `Pembayaran ${fmtRp(q.total)} berhasil. Pesanan dikonfirmasi — barang belum diterima.`, cashAdj: adj ? [adj] : [] };
      db.prepare('UPDATE shop_orders SET resp=? WHERE id=?').run(JSON.stringify(out), oid); setResp(t, out);
    })();
    res.status(out.ok === false ? 402 : 200).json(out);
  }));

  // ————————————————————————— daftar, detail, ringkasan —————————————————————————
  function listOrders(p, nowAbs, filter, limit = 60) {
    tickAll(p, nowAbs);
    const sets = { processing: ['confirmed', 'preparing', 'processing', 'packed'], pickup: ['ready_for_pickup'], delivery: ['handed_to_courier', 'in_transit', 'arriving', 'delivered'], completed: ['completed'], cancelled: ['cancelled', 'delivery_failed', 'return_requested', 'returned'] };
    let rows = db.prepare('SELECT * FROM shop_orders WHERE visitor=? ORDER BY placed_abs DESC, created DESC LIMIT ?').all(p.visitor, limit);
    if (filter && sets[filter]) rows = rows.filter(r => sets[filter].includes(r.ful_status));
    return rows;
  }
  app.get('/api/shop/orders', (req, res) => {
    const p = need(req, res); if (!p) return; const clk = clockGet(req, p); if (clk.error) return fail(res, clk.error);
    const rows = listOrders(p, clk.abs, req.query.filter);
    const counts = db.prepare('SELECT ful_status AS s, COUNT(*) AS n FROM shop_orders WHERE visitor=? GROUP BY ful_status').all(p.visitor);
    res.json({ ok: true, orders: rows.map(r => orderOut(r, clk.abs)), counts: Object.fromEntries(counts.map(c => [c.s, c.n])), nowAbs: clk.abs });
  });
  app.get('/api/shop/order/:id', (req, res) => {
    const p = need(req, res); if (!p) return; const clk = clockGet(req, p); if (clk.error) return fail(res, clk.error);
    tickAll(p, clk.abs); const o = db.prepare('SELECT * FROM shop_orders WHERE id=? AND visitor=?').get(req.params.id, p.visitor); if (!o) return fail(res, 'Pesanan tidak ditemukan.', 404);
    res.json({ ok: true, order: orderOut(o, clk.abs, true), nowAbs: clk.abs });
  });
  app.get('/api/shop/summary', (req, res) => {
    const p = need(req, res); if (!p) return; const clk = clockGet(req, p); if (clk.error) return fail(res, clk.error); const v = p.visitor;
    tickAll(p, clk.abs);
    const rows = db.prepare('SELECT * FROM shop_orders WHERE visitor=? ORDER BY placed_abs DESC LIMIT 40').all(v);
    const by = f => rows.filter(r => f.includes(r.ful_status));
    const proc = by(['confirmed', 'preparing', 'processing', 'packed']), ready = by(['ready_for_pickup']), transit = by(['handed_to_courier', 'in_transit', 'arriving']), arrived = by(['delivered']);
    const act = rows.filter(r => ACTIVE.includes(r.ful_status)); const next = act.slice().sort((a, b) => a.eta_abs - b.eta_abs)[0];
    const fresh = db.prepare('SELECT id, kind, title, body, at_abs AS at, order_id AS orderId FROM shop_notifs WHERE visitor=? AND toasted=0 ORDER BY id').all(v);
    if (fresh.length) db.prepare('UPDATE shop_notifs SET toasted=1 WHERE visitor=? AND toasted=0').run(v);
    const rec = db.prepare("SELECT label, kind, status, source, at_abs AS at FROM shop_rewards WHERE visitor=? AND status='received' ORDER BY created DESC LIMIT 4").all(v);
    const age = ageAt(p.profile, clk.day);
    const promos = C.PROMOS.filter(pr => { const s = STORE(pr.store); return s && promoEligible(pr, s, clk, age, Infinity) && (!pr.minSpend || true) && (pr.kind !== 'shipping' || true); }).filter(pr => { const s = STORE(pr.store); return F.openAt({ hours: s.hours, days: s.days }, clk.day, clk.sec); }).map(pr => ({ id: pr.id, label: pr.label, store: pr.store }));
    res.json({ ok: true, nowAbs: clk.abs, total: rows.length, processing: proc.map(r => orderOut(r, clk.abs)), ready: ready.map(r => orderOut(r, clk.abs)), inDelivery: transit.map(r => orderOut(r, clk.abs)), arrived: arrived.map(r => orderOut(r, clk.abs)),
      next: next ? { id: next.id, store: STORE(next.store)?.name, eta: next.eta_abs } : null, recent: rows.slice(0, 3).map(r => orderOut(r, clk.abs)), rewards: rec, promos, fresh, loyalty: loyalty(v), knowledge: Math.round(db.prepare("SELECT COALESCE(SUM(amount),0) AS n FROM shop_rewards WHERE visitor=? AND kind='knowledge_xp' AND status='received'").get(v).n) });
  });
  app.get('/api/shop/notifs', (req, res) => {
    const p = need(req, res); if (!p) return; const clk = clockGet(req, p); if (clk.error) return fail(res, clk.error); tickAll(p, clk.abs);
    res.json({ ok: true, notifs: db.prepare('SELECT id, kind, title, body, at_abs AS at, order_id AS orderId, read FROM shop_notifs WHERE visitor=? ORDER BY id DESC LIMIT ?').all(p.visitor, C.RULES.notifKeep), unread: db.prepare('SELECT COUNT(*) AS n FROM shop_notifs WHERE visitor=? AND read=0').get(p.visitor).n });
  });
  app.post('/api/shop/notifs/read', (req, res) => { const p = need(req, res); if (!p) return; db.prepare('UPDATE shop_notifs SET read=1, toasted=1 WHERE visitor=?').run(p.visitor); res.json({ ok: true }); });

  // ————————————————————————— batal, retur, terima —————————————————————————
  app.post('/api/shop/order/cancel', guard((req, res) => {
    const p = need(req, res); if (!p) return; const clk = clockPost(req, p); if (clk.error) return fail(res, clk.error); const v = p.visitor;
    tickAll(p, clk.abs);
    let out;
    dbTx(() => {
      const o = db.prepare('SELECT * FROM shop_orders WHERE id=? AND visitor=?').get(req.body.order, v); if (!o) { out = { ok: false, error: 'Pesanan tidak ditemukan.', code: 404 }; return; }
      const c = cancelReason(o, clk.abs); if (!c.ok) { out = { ok: false, error: c.why }; return; }
      const r = db.prepare("UPDATE shop_orders SET ful_status='cancelled', reason=?, end_abs=? WHERE id=? AND ful_status=?").run('Dibatalkan pembeli', clk.abs, o.id, o.ful_status);
      if (!r || !r.changes) { out = { ok: false, error: 'Status pesanan berubah. Muat ulang.' }; return; }
      evIns(o.id, 'cancelled', clk.abs, 'Dibatalkan pembeli');
      restockOrder(o, clk.day); releaseVoucher(o, clk.abs); voidRewards(o.id, 'Pesanan dibatalkan');
      let adj = null;
      if (o.pay_status === 'cod_pending') { db.prepare("UPDATE fin_tx SET status='gagal', reason='Dibatalkan pembeli sebelum diproses' WHERE id=?").run(o.tx_id); db.prepare("UPDATE shop_orders SET pay_status='cancelled' WHERE id=?").run(o.id); }
      else { const rf = refundPayment(p, o, o.total, clk.abs, `Pengembalian dana: ${STORE(o.store)?.name} (dibatalkan)`, true); adj = rf.adj; evIns(o.id, 'refunded', clk.abs, 'Dana dikembalikan', `${fmtRp(o.total)} ke ${o.method_label}`); }
      notify(v, o.id, 'cancel', 'Pesanan dibatalkan', o.pay_status === 'cod_pending' ? 'Pesanan COD dibatalkan. Tidak ada uang yang berpindah.' : `Dana ${fmtRp(o.total)} dikembalikan ke ${o.method_label}.`, clk.abs);
      out = { ...finView(p, clk.abs), ok: true, order: orderOut(db.prepare('SELECT * FROM shop_orders WHERE id=?').get(o.id), clk.abs, true), msg: o.pay_status === 'cod_pending' ? 'Pesanan COD dibatalkan.' : `Pesanan dibatalkan. Dana ${fmtRp(o.total)} dikembalikan ke sumber pembayaran.`, cashAdj: adj ? [adj] : [] };
    })();
    res.status(out.ok === false ? (out.code || 400) : 200).json(out);
  }));

  app.post('/api/shop/order/return', guard((req, res) => {
    const p = need(req, res); if (!p) return; const clk = clockPost(req, p); if (clk.error) return fail(res, clk.error); const v = p.visitor;
    tickAll(p, clk.abs);
    const reason = ['rusak', 'tidak_sesuai', 'berubah_pikiran'].includes(req.body.reason) ? req.body.reason : null; if (!reason) return fail(res, 'Pilih alasan retur.');
    let out;
    dbTx(() => {
      const o = db.prepare('SELECT * FROM shop_orders WHERE id=? AND visitor=?').get(req.body.order, v); if (!o) { out = { ok: false, error: 'Pesanan tidak ditemukan.', code: 404 }; return; }
      const rr = returnReason(o, clk.abs); if (!rr.ok) { out = { ok: false, error: rr.why }; return; }
      const fees = parse(o.fees, []), ship = fees.filter(f => ['shipping', 'service', 'cod'].includes(f.code)).reduce((s, f) => s + f.amount, 0);
      const amount = o.pay_status === 'cod_pending' ? 0 : reason === 'berubah_pikiran' ? Math.max(0, o.total - ship - C.RULES.returnShippingFee) : o.total;
      const origin = Math.max(...parse(o.lines, []).map(l => C.distanceKm(PROD(l.id)?.origin || 'x', p.profile.city)));
      const t1 = clk.abs + 4 * 3600, back = Math.max(1, Math.ceil(origin / 400)) * DAY, t2 = nextHour(t1 + back, 10), t3 = t2 + 6 * 3600;
      const ret = { reason, amount, stages: [{ code: 'ret_pickup', at: t1 }, { code: 'ret_received', at: t2 }, { code: 'ret_refund', at: t3 }] };
      const r = db.prepare("UPDATE shop_orders SET ful_status='return_requested', ret=?, end_abs=NULL WHERE id=? AND ful_status='delivered'").run(JSON.stringify(ret), o.id);
      if (!r || !r.changes) { out = { ok: false, error: 'Status pesanan berubah. Muat ulang.' }; return; }
      evIns(o.id, 'return_requested', clk.abs, 'Pengembalian diajukan', { rusak: 'Barang rusak/cacat', tidak_sesuai: 'Tidak sesuai pesanan', berubah_pikiran: 'Berubah pikiran' }[reason]);
      notify(v, o.id, 'return', 'Pengembalian diajukan', `Retur pesanan ${o.id}: refund ${fmtRp(amount)} setelah penjual menerima barang.`, clk.abs);
      out = { ...finView(p, clk.abs), ok: true, order: orderOut(db.prepare('SELECT * FROM shop_orders WHERE id=?').get(o.id), clk.abs, true), msg: `Retur diajukan. Refund ${fmtRp(amount)} diproses setelah barang diterima penjual.`, cashAdj: [] };
    })();
    res.status(out.ok === false ? (out.code || 400) : 200).json(out);
  }));

  // Terima/ambil pesanan: satu-satunya jalan menuju "completed". Bonus dan barang diberikan sekali (UPDATE bersyarat).
  app.post('/api/shop/order/claim', guard((req, res) => {
    const p = need(req, res); if (!p) return; const clk = clockPost(req, p); if (clk.error) return fail(res, clk.error); const v = p.visitor;
    tickAll(p, clk.abs);
    let out;
    dbTx(() => {
      const o = db.prepare('SELECT * FROM shop_orders WHERE id=? AND visitor=?').get(req.body.order, v); if (!o) { out = { ok: false, error: 'Pesanan tidak ditemukan.', code: 404 }; return; }
      if (o.ful_status === 'completed') { out = { ...finView(p, clk.abs), ok: true, duplicate: true, order: orderOut(o, clk.abs, true), grants: [], msg: 'Pesanan sudah diterima.', cashAdj: [] }; return; }
      if (!AWAIT.includes(o.ful_status)) { out = { ok: false, error: o.ful_status === 'cancelled' || o.ful_status === 'delivery_failed' ? 'Pesanan ini sudah ditutup.' : `Pesanan belum bisa diterima — status: ${C.STAGE_LABEL[o.ful_status] || o.ful_status}.` }; return; }
      const store = STORE(o.store), lines = parse(o.lines, []); let adj = null;
      if (o.pay_status === 'cod_pending') {
        if (cashOf(p) < o.total) {
          // kurir membawa kembali pesanan: tidak ada pembayaran, stok kembali
          db.prepare("UPDATE shop_orders SET ful_status='delivery_failed', pay_status='cancelled', reason=?, end_abs=? WHERE id=?").run('Uang tunai tidak cukup saat COD', clk.abs, o.id);
          db.prepare("UPDATE fin_tx SET status='gagal', reason=? WHERE id=?").run(`Uang tunai kurang saat pesanan tiba (${fmtRp(cashOf(p))})`, o.tx_id);
          evIns(o.id, 'delivery_failed', clk.abs, 'Pengiriman gagal', 'Uang tunai tidak cukup saat COD'); restockOrder(o, clk.day); releaseVoucher(o, clk.abs); voidRewards(o.id, 'Pesanan gagal dikirim');
          notify(v, o.id, 'failed', 'Pengiriman gagal', `Uang tunai ${fmtRp(cashOf(p))} tidak cukup untuk COD ${fmtRp(o.total)}. Kurir membawa kembali pesanan.`, clk.abs);
          out = { ...finView(p, clk.abs), ok: false, error: `Uang tunai tidak cukup (${fmtRp(cashOf(p))}) untuk COD ${fmtRp(o.total)}. Kurir membawa kembali pesanan.`, order: orderOut(db.prepare('SELECT * FROM shop_orders WHERE id=?').get(o.id), clk.abs, true), cashAdj: [] }; return;
        }
        adj = cashApply(p, -o.total, store.cat === 'makanan' ? 'makan' : 'belanja', `COD ${store.name}`, o.tx_id);
        db.prepare("UPDATE fin_tx SET status='berhasil', reason=NULL, day=?, sec=? WHERE id=?").run(clk.day, clk.sec, o.tx_id); db.prepare("UPDATE shop_orders SET pay_status='paid' WHERE id=?").run(o.id);
      }
      const c = db.prepare("UPDATE shop_orders SET ful_status='completed', done_abs=?, end_abs=? WHERE id=? AND ful_status IN ('delivered','ready_for_pickup')").run(clk.abs, clk.abs, o.id);
      if (!c || !c.changes) { out = { ok: false, error: 'Pesanan sudah diterima.' }; return; }
      evIns(o.id, 'completed', clk.abs, o.mode === 'counter' || o.mode === 'pickup' ? 'Pesanan diambil' : o.mode === 'digital' ? 'Akses dibuka' : 'Pesanan diterima');
      const grants = [], received = [];
      const give = (kind, payload, rewardId) => grants.push(addGrant(v, kind, payload, rewardId, o.id));
      // 1) barang & efek utama produk
      const eatLines = lines.filter(l => ['eat', 'service'].includes(PROD(l.id)?.use));
      if (eatLines.length) {
        const fx = {}; let min = 0, health = 0;
        for (const l of eatLines) { const pr = PROD(l.id), vr = pr.variants.find(x => x.id === l.variant) || pr.variants[0]; const m = vr.fxMult || 1; for (const [k, val] of Object.entries(pr.fx)) fx[k] = (fx[k] || 0) + val * m * l.qty; for (const [k, val] of Object.entries(vr.fxAdd || {})) fx[k] = (fx[k] || 0) + val * l.qty; min = Math.max(min, (pr.min || 0) + (vr.minAdd || 0)); if (pr.health) health += pr.health * l.qty; }
        if (health) fx.health = (fx.health || 0) + health;
        for (const k of Object.keys(fx)) fx[k] = Math.round(fx[k] * 10) / 10;
        const trav = (o.mode === 'counter') ? (store.travelMin || 0) * 2 : 0;
        const fxTxt = Object.entries(fx).filter(([, x]) => x).map(([k, x]) => `${k} ${x > 0 ? '+' : ''}${x}`).join(', ');
        const label = eatLines.map(l => l.name).join(', ');
        give('consume', { label: `${label} (${store.name})`, min: min + trav, fx });
        const rid1 = rid('rw'); db.prepare("INSERT INTO shop_rewards (id, visitor, order_id, bonus_key, kind, label, amount, payload, status, reason, source, at_abs, created) VALUES (?,?,?,?,?,?,?,?,'received',NULL,?,?,?) ON CONFLICT(order_id, bonus_key) DO NOTHING").run(rid1, v, o.id, 'recovery', 'need', `Pemulihan kebutuhan: ${fxTxt || '-'}`, 0, JSON.stringify({ fx }), `${store.name} · ${o.id}`, clk.abs, now());
      }
      for (const l of lines) {
        const pr = PROD(l.id); if (!pr) continue;
        if (pr.use === 'stock') give('inv_add', { item: { id: pr.id, name: pr.name, kind: pr.kind, uses: pr.uses, fx: pr.fx, min: pr.min, health: pr.health }, qty: l.qty * (pr.qtyPerUnit || 1) });
        if (pr.use === 'own') give('inv_add', { item: { id: pr.id, name: pr.name, kind: pr.kind, upgrade: pr.upgrade, unlock: pr.unlock }, qty: l.qty });
      }
      // 2) bonus produk (sekali per aturan) — status pending → received
      for (const rw of db.prepare("SELECT * FROM shop_rewards WHERE order_id=? AND status='pending'").all(o.id)) {
        const pl = parse(rw.payload, {}); const onceKey = pl.once === 'item' ? `bonus:${pl.product}:${pl.key}` : null;
        if (onceKey && db.prepare('SELECT 1 FROM shop_once WHERE visitor=? AND key=?').get(v, onceKey)) { db.prepare("UPDATE shop_rewards SET status='ineligible', reason='Bonus produk ini sudah pernah diterima' WHERE id=?").run(rw.id); continue; }
        let applied = null;
        if (pl.kind === 'edu_mastery') {
          const ei = eduInfo(p); const termKey = `edu:${pl.product}:${ei.termKey}`;
          if (!ei.enrolled || !ei.subjects.includes(pl.subject)) { db.prepare("UPDATE shop_rewards SET status='ineligible', reason='Tidak sedang bersekolah dengan pelajaran terkait' WHERE id=?").run(rw.id); continue; }
          if (db.prepare('SELECT 1 FROM shop_once WHERE visitor=? AND key=?').get(v, termKey)) { db.prepare("UPDATE shop_rewards SET status='ineligible', reason='Sudah dipakai pada periode sekolah ini' WHERE id=?").run(rw.id); continue; }
          const rr = eduMastery(v, pl.subject, pl.amount); if (!rr) { db.prepare("UPDATE shop_rewards SET status='ineligible', reason='Pelajaran tidak ditemukan pada periode ini' WHERE id=?").run(rw.id); continue; }
          db.prepare('INSERT INTO shop_once (visitor, key) VALUES (?, ?) ON CONFLICT DO NOTHING').run(v, termKey);
          applied = () => { received.push(rw.id); };
        } else if (pl.kind === 'knowledge_xp') applied = () => give('knowledge', { amount: pl.amount }, rw.id);
        else if (pl.kind === 'skill_xp') applied = () => give('skill', { skill: pl.skill, amount: pl.amount }, rw.id);
        else if (pl.kind === 'need') applied = () => give('need', { fx: pl.fx, label: rw.label }, rw.id);
        else if (pl.kind === 'item') applied = () => { const ip = PROD(pl.item); give('inv_add', { item: { id: ip.id, name: ip.name, kind: ip.kind, uses: ip.uses, fx: ip.fx, min: ip.min, health: ip.health }, qty: pl.qty || 1 }, rw.id); };
        else if (pl.kind === 'voucher') applied = () => { grantVoucher(v, pl.voucher, clk.abs, `${store.name} · ${o.id}`); };
        if (!applied) continue;
        if (receiveReward(v, o.id, rw, clk.abs, applied) !== null || true) { if (onceKey) db.prepare('INSERT INTO shop_once (visitor, key) VALUES (?, ?) ON CONFLICT DO NOTHING').run(v, onceKey); }
      }
      // 3) loyalitas, voucher tier, pencapaian
      const net = Math.max(0, o.sub - parse(o.discounts, []).filter(d => d.code !== 'shipping').reduce((s, d) => s - Math.min(0, d.amount) * -1, 0) * 0);
      const pts = Math.floor(Math.max(0, o.sub - parse(o.discounts, []).filter(d => d.type !== 'promo' || !/ONGKIR/.test(d.code)).reduce((s, d) => s - d.amount, 0)) / C.LOYALTY.pointPerRp); void net;
      const before = loyalty(v).points;
      db.prepare('INSERT INTO shop_loyalty (visitor, points, done) VALUES (?,?,1) ON CONFLICT(visitor) DO UPDATE SET points=points+?, done=done+1').run(v, pts, pts);
      if (pts > 0) addSystemReward(v, o.id, 'loyalty', 'loyalty', `+${pts} poin loyalitas`, `${store.name} · ${o.id}`, clk.abs, pts);
      for (const t of C.LOYALTY.tiers) if (before < t.at && before + pts >= t.at && db.prepare('INSERT INTO shop_once (visitor, key) VALUES (?, ?) ON CONFLICT DO NOTHING').run(v, 'tier:' + t.id).changes) { grantVoucher(v, t.voucher, clk.abs, `Loyalitas ${t.label}`); addSystemReward(v, o.id, 'tier-' + t.id, 'voucher', `Naik ke tingkat ${t.label}: ${C.VOUCHERS[t.voucher].label}`, 'Program loyalitas', clk.abs); }
      const sv = stat(v);
      for (const a of C.ACHIEVEMENTS) if (sv[a.stat] >= a.need && db.prepare('INSERT INTO shop_once (visitor, key) VALUES (?, ?) ON CONFLICT DO NOTHING').run(v, 'ach:' + a.id).changes) { addSystemReward(v, o.id, 'ach-' + a.id, 'achievement', `Pencapaian: ${a.label}`, 'Pencapaian belanja', clk.abs); if (a.voucher) { grantVoucher(v, a.voucher, clk.abs, `Pencapaian: ${a.label}`); } give('log', { text: `Pencapaian belanja: ${a.label}.` }); }
      notify(v, o.id, 'done', 'Pesanan selesai', `Pesanan ${o.id} ${o.mode === 'counter' || o.mode === 'pickup' ? 'diambil' : 'diterima'}.`, clk.abs);
      out = { ...finView(p, clk.abs), ok: true, order: orderOut(db.prepare('SELECT * FROM shop_orders WHERE id=?').get(o.id), clk.abs, true), grants, shopSeq: claimSeq(v), msg: o.mode === 'digital' ? 'Akses dibuka. Bonus belajar sudah dicatat.' : 'Pesanan diterima.', cashAdj: adj ? [adj] : [] };
    })();
    res.status(out.ok === false ? (out.code || 400) : 200).json(out);
  }));

  // ————————————————————————— reward center —————————————————————————
  app.get('/api/shop/rewards', (req, res) => {
    const p = need(req, res); if (!p) return; const clk = clockGet(req, p); if (clk.error) return fail(res, clk.error); const v = p.visitor; tickAll(p, clk.abs);
    const rows = db.prepare('SELECT id, order_id AS orderId, kind, label, amount, status, reason, source, at_abs AS at FROM shop_rewards WHERE visitor=? ORDER BY created DESC, rowid DESC LIMIT 120').all(v);
    const lo = loyalty(v), tier = [...C.LOYALTY.tiers].reverse().find(t => lo.points >= t.at) || null, nextTier = C.LOYALTY.tiers.find(t => lo.points < t.at) || null;
    const vouchers = db.prepare('SELECT id, code, label, kind, value, max_discount AS max, min_spend AS minSpend, store, expires_abs AS expires, status, source FROM shop_vouchers WHERE visitor=? ORDER BY rowid DESC LIMIT 40').all(v).map(x => ({ ...x, status: x.status === 'available' && x.expires && clk.abs > x.expires ? 'expired' : x.status }));
    const sv = stat(v), ach = C.ACHIEVEMENTS.map(a => ({ id: a.id, label: a.label, have: Math.min(sv[a.stat], a.need), need: a.need, earned: db.prepare('SELECT 1 FROM shop_once WHERE visitor=? AND key=?').get(v, 'ach:' + a.id) != null }));
    res.json({ ok: true, rewards: rows, loyalty: { points: lo.points, done: lo.done, tier: tier ? tier.label : 'Belum ada tingkat', next: nextTier ? { label: nextTier.label, at: nextTier.at, reward: C.VOUCHERS[nextTier.voucher].label } : null, perPoint: C.LOYALTY.pointPerRp }, vouchers, achievements: ach,
      knowledge: Math.round(rows.filter(r => r.kind === 'knowledge_xp' && r.status === 'received').reduce((s, r) => s + r.amount, 0)) });
  });
  app.get('/api/shop/grants', (req, res) => {
    const p = need(req, res); if (!p) return; const after = Number(req.query.after) || 0;
    res.json({ ok: true, shopSeq: claimSeq(p.visitor), grants: db.prepare('SELECT seq, kind, payload FROM shop_grants WHERE visitor=? AND seq>? ORDER BY seq').all(p.visitor, after).map(g => ({ seq: g.seq, kind: g.kind, ...parse(g.payload, {}) })) });
  });

  return {
    migrate,
    // Dipanggil PUT /api/game: save yang belum memuat grants terbaru ditolak (mencegah bonus/barang hilang atau ganda).
    checkSeq(visitor, game) {
      const need = claimSeq(visitor), have = Number(game.shopSeq) || 0; if (have >= need) return null;
      return db.prepare('SELECT seq, kind, payload FROM shop_grants WHERE visitor=? AND seq>? ORDER BY seq').all(visitor, have).map(g => ({ seq: g.seq, kind: g.kind, ...parse(g.payload, {}) }));
    },
    reset(visitor) { for (const t of ['shop_stock', 'shop_orders', 'shop_notifs', 'shop_rewards', 'shop_grants', 'shop_vouchers', 'shop_loyalty', 'shop_once']) db.prepare(`DELETE FROM ${t} WHERE visitor=?`).run(visitor); db.prepare('DELETE FROM shop_events WHERE order_id NOT IN (SELECT id FROM shop_orders)').run(); db.prepare('UPDATE players SET shop_seq=0 WHERE visitor=?').run(visitor); },
  };
};
