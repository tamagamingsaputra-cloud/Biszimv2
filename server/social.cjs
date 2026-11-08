// SOCIAL COMMERCE (P7 + P8) — influencer, endorsement, affiliate, chat penjual/pembeli, ulasan, retur/refund sisi penjual.
// Semua hasil deterministik (hash id+hari), uang lewat Keuangan inti (payStock = debit, creditIn = kredit), tanpa ekonomi kedua.
const M = require('./market-catalog.cjs');
const ECON = require('./mp-economy.cjs');
const { hf } = M;
const clamp = ECON.clamp;
const parse = (t, d = null) => { if (t == null || t === '') return d; try { return JSON.parse(t); } catch { return d; } };

// ————————————————————————— katalog influencer (fiktif) —————————————————————————
const INFL_SRC = [['Rara Kinanti', 'kecantikan', 'Kreator perawatan wajah dan tubuh.'], ['Bimo Gadget', 'elektronik', 'Ulasan gawai dan aksesori jujur.'], ['Dapur Mbak Sari', 'makanan', 'Resep rumahan dan jajanan viral.'], ['Fajar Outdoor', 'olahraga', 'Pendaki dan pelari, ulas perlengkapan luar ruang.'], ['Tika Style', 'fashion', 'Padu padan busana harian terjangkau.'], ['Pak Tani Digital', 'pertanian', 'Berbagi tips bercocok tanam modern.'], ['Dr. Nisa Sehat', 'kesehatan', 'Edukasi kesehatan keluarga.'], ['Raka Otomotif', 'kendaraan', 'Motor, sepeda, dan perawatannya.'], ['Kak Ayu Belajar', 'pendidikan', 'Tips belajar, buku, dan alat tulis.'], ['Dewi Rumah Cantik', 'rumah', 'Penataan rumah dan dapur hemat.'], ['Doni Kerja Cerdas', 'kerja', 'Perkakas dan perlengkapan kerja.'], ['Rio Sahabat Hewan', 'hewan', 'Merawat hewan peliharaan.'], ['Lia Serba Ada', null, 'Kreator umum: unboxing aneka produk.']];
const INFLUENCERS = INFL_SRC.map(([name, cat, bio], i) => {
  const id = 'inf' + (i + 1), followers = Math.round(Math.exp(Math.log(18000) + hf(id, 'f') * Math.log(140)) / 100) * 100;
  const er = Math.round((0.12 - 0.095 * Math.log10(followers / 18000) / Math.log10(140) + (hf(id, 'e') - 0.5) * 0.02) * 1000) / 1000, popularity = Math.round(35 + hf(id, 'p') * 60), reputation = Math.round(45 + hf(id, 'r') * 50);
  const aud = { age: ['13–17', '18–24', '25–34', '35–44'][Math.floor(hf(id, 'a') * 4)], priceSens: Math.round((0.3 + hf(id, 'ps') * 0.6) * 100) / 100, cats: cat ? [cat] : M.CATEGORIES.slice().sort((a, b) => hf(id, a.id) - hf(id, b.id)).slice(0, 4).map(c => c.id) };
  const rate = Math.max(150000, Math.min(30_000_000, Math.round(followers * 0.014 * (0.6 + popularity / 100) / 50000) * 50000));
  return { id, name, bio, cat, followers, er, popularity, reputation, rate, audience: aud };
});
const TYPES = { review: { label: 'Review produk', rate: 1, reach: 0.55, conv: 1.0, days: [1, 7] }, video: { label: 'Video pendek', rate: 1.5, reach: 1.4, conv: 0.85, days: [1, 7] }, story: { label: 'Story', rate: 0.45, reach: 0.4, conv: 0.7, days: [1, 3] }, unboxing: { label: 'Unboxing', rate: 1.15, reach: 0.8, conv: 1.25, days: [1, 7] }, live: { label: 'Live shopping', rate: 2.4, reach: 0.9, conv: 1.9, days: [1, 3] }, kampanye: { label: 'Kampanye promosi', rate: 3.2, reach: 2.0, conv: 1.1, days: [3, 14] } };
const AFF_RATE = { elektronik: 0.03, fashion: 0.08, makanan: 0.05, rumah: 0.06, kendaraan: 0.03, kesehatan: 0.06, kecantikan: 0.09, pendidikan: 0.05, olahraga: 0.07, pertanian: 0.05, kerja: 0.05, hewan: 0.06 };
const NPC_AFF = ['Tiara Promo', 'Bagas Rekomendasi', 'Nadia Diskon', 'Yoga Review', 'Mega Hemat', 'Arif Pilihan', 'Salsa Belanja'];
const BAD = /\b(anjing|bangsat|babi|goblok|tolol|bodoh|kontol|memek|brengsek|sialan|bajingan|asu|tai)\b/i, THREAT = /\b(bunuh|hajar kau|awas kau|ku habisi|kuhabisi)\b/i;

module.exports = function mountSocial(app, H, F, CM, SL, MKT) {
  const { db, tx: dbTx, vid, rid, now, fail, getPlayer } = H;
  const { creditIn, idemOk, findIdem, setResp, finView: _fv } = { ...F, finView: F.view };
  const X = SL.X, { hooks, handle, str, intIn, ev, notif, quality, effPrice, refPrice, fmtRp, dayOfAbs, WARM, DAY, COMMISSION } = X;
  const finView = F.view;

  const SCHEMA = `
  CREATE TABLE IF NOT EXISTS sl_camps (id TEXT PRIMARY KEY, visitor TEXT, prod TEXT, prod_name TEXT, influencer TEXT, type TEXT, cost INTEGER, start_day INTEGER, days INTEGER, status TEXT, plan TEXT, result TEXT, proc_day INTEGER, created_abs INTEGER);
  CREATE TABLE IF NOT EXISTS af_accounts (visitor TEXT PRIMARY KEY, since_day INTEGER, bal INTEGER DEFAULT 0, paid INTEGER DEFAULT 0, last_tick INTEGER, audience INTEGER DEFAULT 400);
  CREATE TABLE IF NOT EXISTS af_links (id TEXT PRIMARY KEY, visitor TEXT, listing TEXT, market TEXT, code TEXT, created_day INTEGER, clicks INTEGER DEFAULT 0, orders INTEGER DEFAULT 0, earn INTEGER DEFAULT 0, active INTEGER DEFAULT 1);
  CREATE TABLE IF NOT EXISTS af_days (link TEXT, day INTEGER, visitor TEXT, clicks INTEGER, orders INTEGER, earn INTEGER, PRIMARY KEY (link, day));
  CREATE TABLE IF NOT EXISTS ch_threads (id TEXT PRIMARY KEY, visitor TEXT, kind TEXT, ref TEXT, title TEXT, npc TEXT, state TEXT, created_abs INTEGER, last_abs INTEGER, unread INTEGER DEFAULT 0, pending INTEGER DEFAULT 0, penal INTEGER DEFAULT 0, meta TEXT);
  CREATE TABLE IF NOT EXISTS ch_msgs (id INTEGER PRIMARY KEY AUTOINCREMENT, thread TEXT, visitor TEXT, who TEXT, text TEXT, abs INTEGER, opts TEXT);
  CREATE TABLE IF NOT EXISTS rv_buyer (order_id TEXT PRIMARY KEY, visitor TEXT, listing TEXT, seller TEXT, stars INTEGER, quality INTEGER, ship INTEGER, service INTEGER, text TEXT, photo TEXT, abs INTEGER);`;
  const TABLES = ['sl_camps', 'af_accounts', 'af_links', 'af_days', 'ch_threads', 'ch_msgs', 'rv_buyer'];
  function migrate() { db.exec(SCHEMA); for (const ix of ['CREATE INDEX IF NOT EXISTS ix_ch_t ON ch_threads (visitor, last_abs)', 'CREATE INDEX IF NOT EXISTS ix_ch_m ON ch_msgs (thread, id)', 'CREATE INDEX IF NOT EXISTS ix_camps ON sl_camps (visitor, status)', 'CREATE INDEX IF NOT EXISTS ix_aflinks ON af_links (visitor)']) { try { db.exec(ix); } catch { /* opsional */ } } }
  const reset = v => { for (const t of TABLES) db.prepare(`DELETE FROM ${t} WHERE visitor=?`).run(v); };
  const need = (req, res) => { const p = getPlayer(vid(req)); if (!p || !p.profile || !p.game) { fail(res, 'Profil atau save game belum ada.', 404); return null; } return p; };
  const clkOf = (req, p) => { const c = req.method === 'GET' ? { day: req.query.day, sec: req.query.sec } : (req.body?.clock || {}); return CM.absOfClock(p, c.day, c.sec); };
  const wrap = (fn, { shop = false } = {}) => (req, res) => { try { const p = need(req, res); if (!p) return; const clk = clkOf(req, p); if (clk.error) return fail(res, clk.error); const s = shop ? SL.X.refresh(p, clk.abs) : X.shopOf(p.visitor); if (shop && !s) return fail(res, 'Buka toko terlebih dahulu di Seller Center.', 404, { code: 'sl-noshop' }); fn({ p, v: p.visitor, clk, shop: s, req, res }); } catch (e) { if (e.user) return fail(res, e.user, e.code && e.code < 600 ? e.code : 400); console.error('[social]', e); fail(res, 'Kesalahan server.', 500); } };
  const bad = (m, code = 400) => { throw Object.assign(new Error(), { user: m, code }); };
  const guard = F.guard;
  const econOf = p => ECON.econOf(p.game || {});

  // ————————————————————————— P7: influencer & kampanye —————————————————————————
  const infOut = i => ({ ...i, rates: Object.fromEntries(Object.entries(TYPES).map(([k, t]) => [k, Math.round(i.rate * t.rate / 5000) * 5000])) });
  app.get('/api/sell/influencers', wrap(({ v, res }) => { res.json({ ok: true, influencers: INFLUENCERS.map(infOut), types: Object.fromEntries(Object.entries(TYPES).map(([k, t]) => [k, { label: t.label, days: t.days }])) }); }, { shop: true }));
  // Perhitungan kampanye (dipakai untuk pratinjau dan saat dibuat): seluruh faktor ditampilkan agar hasil dapat dijelaskan.
  function plan(campId, shop, pr, inf, type, days, day, econ) {
    const T = TYPES[type], ref = refPrice(pr.sub), eff = effPrice(pr), q = quality(pr);
    const fit = inf.audience.cats.includes(pr.cat) ? (inf.cat ? 1 : 0.7) : 0.3, priceFit = clamp(Math.pow(ref / Math.max(500, eff), 0.5), 0.3, 1.5), repShop = 0.5 + shop.rep / 100;
    const ev = ECON.eventEffect(day, (parse(pr.markets, [])[0]), pr.cat).demand, market = clamp(econ.consumer * ev, 0.6, 1.8);
    const flop = hf(campId, 'flop') < 0.12 + (inf.reputation < 55 ? 0.08 : 0), luck = clamp(0.6 + hf(campId, 'luck') * 0.9 - (flop ? 0.4 : 0), 0.2, 1.5);
    const views = Math.round(inf.followers * T.reach * (inf.popularity / 100) * (0.5 + 0.5 * luck) * Math.sqrt(days) * (0.8 + inf.reputation / 250));
    const impressions = Math.round(views * (1.4 + hf(campId, 'imp') * 0.5)), engagement = Math.round(impressions * inf.er * (0.5 + fit * 0.5)), clicks = Math.round(engagement * (0.28 + 0.1 * fit)), visits = Math.round(clicks * 0.82);
    const conv = clamp(0.012 * fit * (0.5 + q / 5) * priceFit * repShop * market * T.conv * luck, 0.0005, 0.12);
    return { views, impressions, engagement, clicks, visits, conv: Math.round(conv * 10000) / 10000, orders: Math.max(0, Math.round(visits * conv)), factors: { fit, quality: Math.round(q * 10) / 10, price: Math.round(priceFit * 100) / 100, shopRep: Math.round(repShop * 100) / 100, market: Math.round(market * 100) / 100, luck: Math.round(luck * 100) / 100, flop } };
  }
  const costOf = (inf, type, days) => Math.round(inf.rate * TYPES[type].rate * (1 + 0.08 * (days - 1)) / 5000) * 5000;
  const campOut = c => ({ id: c.id, prod: c.prod, prodName: c.prod_name, influencer: INFLUENCERS.find(i => i.id === c.influencer), type: c.type, typeLabel: TYPES[c.type]?.label, cost: c.cost, startDay: c.start_day, days: c.days, status: c.status, plan: parse(c.plan), result: parse(c.result) });
  app.get('/api/sell/campaigns', wrap(({ v, res }) => { res.json({ ok: true, items: db.prepare('SELECT * FROM sl_camps WHERE visitor=? ORDER BY created_abs DESC LIMIT 40').all(v).map(campOut) }); }, { shop: true }));
  app.post('/api/sell/campaign/preview', wrap(({ p, v, clk, shop, req, res }) => {
    const b = req.body || {}, pr = X.ownProd(v, b.prod), inf = INFLUENCERS.find(i => i.id === b.influencer), type = b.type, days = intIn(b.days, 1, 14);
    if (!inf || !TYPES[type] || days == null) bad('Pilih influencer, jenis, dan durasi.'); if (days < TYPES[type].days[0] || days > TYPES[type].days[1]) bad(`${TYPES[type].label}: durasi ${TYPES[type].days[0]}–${TYPES[type].days[1]} hari.`);
    const pl = plan('preview', shop, pr, inf, type, days, clk.day, econOf(p)), cost = costOf(inf, type, days);
    const unitNet = effPrice(pr) * (1 - 0.05) - pr.cost; res.json({ ok: true, cost, expected: { ...pl, orders: pl.orders, revenue: pl.orders * effPrice(pr), profit: Math.round(pl.orders * unitNet - cost) }, note: 'Pratinjau memakai faktor rata-rata; hasil sebenarnya dipengaruhi keberuntungan kampanye dan bisa gagal.' });
  }, { shop: true }));
  app.post('/api/sell/campaign', guard(wrap(({ p, v, clk, shop, req, res }) => {
    const b = req.body || {}; if (!idemOk(b.idem)) bad('Kunci transaksi tidak valid.'); const dup = findIdem(v, b.idem); if (dup) return res.json({ ...dup, duplicate: true });
    const pr = X.ownProd(v, b.prod), inf = INFLUENCERS.find(i => i.id === b.influencer), type = b.type, days = intIn(b.days, 1, 14);
    if (!inf || !TYPES[type] || days == null) bad('Pilih influencer, jenis, dan durasi.'); if (days < TYPES[type].days[0] || days > TYPES[type].days[1]) bad(`${TYPES[type].label}: durasi ${TYPES[type].days[0]}–${TYPES[type].days[1]} hari.`);
    if (!pr.active || pr.stock <= 0) bad('Produk harus aktif dan punya stok untuk dipromosikan.');
    if (db.prepare("SELECT COUNT(*) AS n FROM sl_camps WHERE visitor=? AND status='berjalan'").get(v).n >= 3) bad('Maksimal 3 kampanye berjalan sekaligus.');
    if (db.prepare("SELECT 1 FROM sl_camps WHERE visitor=? AND prod=? AND status='berjalan'").get(v, pr.id)) bad('Produk ini sudah punya kampanye berjalan.');
    const cost = costOf(inf, type, days), id = rid('camp'); let out;
    dbTx(() => {
      const pay = X.payStock(p, clk, b, cost, `Endorsement ${inf.name} (${TYPES[type].label})`, b.idem); if (pay.error) bad(pay.error);
      const pl = plan(id, shop, pr, inf, type, days, clk.day, econOf(p));
      db.prepare("INSERT INTO sl_camps (id, visitor, prod, prod_name, influencer, type, cost, start_day, days, status, plan, proc_day, created_abs) VALUES (?,?,?,?,?,?,?,?,?,'berjalan',?,?,?)").run(id, v, pr.id, pr.name, inf.id, type, cost, clk.day, days, JSON.stringify(pl), clk.day, clk.abs);
      out = { ...finView(p, clk.abs), ok: true, campaign: campOut(db.prepare('SELECT * FROM sl_camps WHERE id=?').get(id)), msg: `Kampanye dimulai. Biaya ${fmtRp(cost)} dibayar; hasil muncul selama ${days} hari simulasi.` }; setResp(pay.tx, out);
    })(); res.json(out);
  })));
  // Pesanan hasil kampanye: terdistribusi per hari simulasi (bobot menurun), dibatasi stok nyata; selesai → hasil final + notifikasi.
  hooks.extra = (p, shop, abs) => {
    const v = p.visitor, today = dayOfAbs(abs);
    for (const c of db.prepare("SELECT * FROM sl_camps WHERE visitor=? AND status='berjalan'").all(v)) {
      const pl = parse(c.plan), end = c.start_day + c.days; let proc = c.proc_day;
      for (let d = Math.max(c.proc_day, c.start_day) + 1; d <= Math.min(today, end); d++) {
        const wsum = Array.from({ length: c.days }, (_, i) => 1 / (1 + i * 0.6)).reduce((a, b) => a + b, 0), w = (1 / (1 + (d - c.start_day - 1) * 0.6)) / wsum, n = Math.round(pl.orders * w + (hf(c.id, d, 'j') - 0.5));
        for (let k = 0; k < Math.max(0, n); k++) makeCampOrder(p, shop, c, d, k, abs);
        proc = d;
      }
      if (today > end || proc >= end) finishCamp(p, c, end, abs); else if (proc !== c.proc_day) db.prepare('UPDATE sl_camps SET proc_day=? WHERE id=?').run(proc, c.id);
    }
  };
  function makeCampOrder(p, shop, c, d, k, abs) {
    const v = p.visitor, pr = db.prepare('SELECT * FROM sl_prods WHERE id=? AND deleted=0').get(c.prod); if (!pr || pr.stock <= 0) return;
    const id = `slo-${c.id}-${d}-${k}`, qty = Math.min(pr.stock, hf(id, 'q') < 0.7 ? 1 : 2), unit = effPrice(pr), gross = unit * qty, mk = parse(pr.markets, []), market = mk[Math.floor(hf(id, 'm') * mk.length)];
    const fee = Math.round(gross * COMMISSION[market]), at = (d + WARM) * DAY + Math.round((8 + hf(id, 't') * 14) * 3600), city = M.CITIES[Math.floor(hf(id, 'c') * M.CITIES.length)], buyer = X.buyerName(id);
    const r0 = db.prepare("INSERT OR IGNORE INTO sl_orders (id, visitor, prod, name, variant, qty, unit, gross, voucher, fee, cost, market, buyer, city, status, source, ref, created_abs) VALUES (?,?,?,?,?,?,?,?,0,?,?,?,?,?,'baru','influencer',?,?)").run(id, v, pr.id, pr.name, null, qty, unit, gross, fee, pr.cost * qty, market, buyer, city, c.id, at);
    if (!r0.changes) return; db.prepare('UPDATE sl_prods SET stock=stock-?, sold=sold+? WHERE id=?').run(qty, qty, pr.id); ev(v, id, at, 'baru', `Pesanan dari kampanye ${INFLUENCERS.find(i => i.id === c.influencer).name}: ${buyer} via ${M.MARKET(market).name}.`);
    if (dayOfAbs(abs) - d <= 2) notif(v, id, 'sl_new', 'Pesanan toko baru', `${qty}× ${pr.name} dari kampanye endorsement (${buyer}).`, at);
  }
  function finishCamp(p, c, end, abs) {
    const v = p.visitor, pl = parse(c.plan), rows = db.prepare("SELECT * FROM sl_orders WHERE visitor=? AND ref=? AND status!='dibatalkan'").all(v, c.id);
    const revenue = rows.reduce((s, o) => s + o.gross - o.voucher, 0), net = rows.reduce((s, o) => s + o.gross - o.voucher - o.fee - o.cost, 0), profit = net - c.cost, achieved = rows.reduce((s, o) => s + o.qty, 0);
    const res = { views: pl.views, impressions: pl.impressions, engagement: pl.engagement, clicks: pl.clicks, visits: pl.visits, planned: pl.orders, orders: rows.length, units: achieved, revenue, profit, roi: c.cost ? Math.round(profit / c.cost * 100) : 0, success: profit > 0, flop: pl.factors.flop, shortfall: achieved < pl.orders * 0.8 ? 'Stok atau status produk membatasi penjualan kampanye.' : null };
    const r0 = db.prepare("UPDATE sl_camps SET status='selesai', result=? WHERE id=? AND status='berjalan'").run(JSON.stringify(res), c.id); if (!r0.changes) return;
    db.prepare('UPDATE sl_shops SET rep=MIN(100, rep+?) WHERE visitor=?').run(profit > 0 ? 0.8 : -0.3, v);
    notif(v, c.id, 'sl_camp', 'Endorsement selesai', `${INFLUENCERS.find(i => i.id === c.influencer).name} · ${c.prod_name}: ${res.units} terjual, ${res.profit >= 0 ? 'untung' : 'rugi'} ${fmtRp(Math.abs(res.profit))} setelah biaya promosi.`, (end + WARM) * DAY + 3600);
  }

  // ————————————————————————— P7: NPC influencer/affiliate mempromosikan produk pemain —————————————————————————
  const npcPromoOf = (prodId, day) => { const q = hf(prodId, day, 'npcp'); return q < 0.1 ? { who: NPC_AFF[Math.floor(hf(prodId, day, 'who') * NPC_AFF.length)], mult: 1.2 + hf(prodId, day, 'pm') * 0.6 } : null; };
  hooks.boost = (v, prodId, day) => { const a = npcPromoOf(prodId, day), b = npcPromoOf(prodId, day - 1); return Math.max(a ? a.mult : 1, b ? 1 + (b.mult - 1) * 0.5 : 1); };

  // ————————————————————————— P7: affiliate pemain —————————————————————————
  const afRow = v => db.prepare('SELECT * FROM af_accounts WHERE visitor=?').get(v);
  const afRate = cat => AFF_RATE[cat] || 0.04;
  function afTick(p, abs) {
    const v = p.visitor, a = afRow(v); if (!a) return null; const today = dayOfAbs(abs), from = Math.max(a.last_tick + 1, today - 60); if (from > today) return a; const econ = econOf(p);
    dbTx(() => {
      let aud = a.audience, bal = 0;
      const links = db.prepare('SELECT * FROM af_links WHERE visitor=? AND active=1').all(v);
      for (let d = from; d <= today; d++) {
        aud = Math.min(8000, Math.round(aud * (1 + 0.004 * Math.min(links.length, 5))));
        for (const l of links) {
          if (d <= l.created_day) continue; const li = M.LISTING(l.listing); if (!li) continue; const pr = M.PRODUCTS.find(x => x.id === li.product);
          const pop = (Math.log(li.sold + 1) / 7 + li.rating / 5) / 2, ev = ECON.eventEffect(d, li.market, pr.cat).demand, lam = aud / 400 * 4 * pop * ev * econ.consumer;
          const clicks = X.poisson(lam, hf(l.id, d, 'ck')), conv = clamp(0.015 + 0.03 * li.rating / 5 - (li.sale > 500000 ? 0.01 : 0), 0.004, 0.06); let orders = 0; for (let i = 0; i < clicks; i++) if (hf(l.id, d, i, 'cv') < conv) orders++;
          const earn = Math.round(orders * li.sale * afRate(pr.cat)); if (!clicks && !earn) continue;
          const r0 = db.prepare('INSERT OR IGNORE INTO af_days (link, day, visitor, clicks, orders, earn) VALUES (?,?,?,?,?,?)').run(l.id, d, v, clicks, orders, earn);
          if (r0.changes) { db.prepare('UPDATE af_links SET clicks=clicks+?, orders=orders+?, earn=earn+? WHERE id=?').run(clicks, orders, earn, l.id); bal += earn; }
        }
      }
      db.prepare('UPDATE af_accounts SET last_tick=?, audience=?, bal=bal+? WHERE visitor=?').run(today, aud, bal, v);
      if (bal > 0) notif(v, 'af-' + today, 'af_earn', 'Komisi affiliate bertambah', `+${fmtRp(bal)} dari penjualan lewat tautanmu. Cairkan di Affiliate.`, abs);
    })(); return afRow(v);
  }
  const afGuard = fn => wrap(({ p, clk, req, res, v }) => { const a = afTick(p, clk.abs); fn({ p, v, clk, req, res, a }); });
  app.get('/api/aff/me', afGuard(({ v, clk, res, a }) => {
    if (!a) return res.json({ ok: true, joined: false, minWithdraw: 25000 });
    const today = dayOfAbs(clk.abs), links = db.prepare('SELECT * FROM af_links WHERE visitor=? AND active=1 ORDER BY created_day DESC, rowid DESC').all(v).map(l => { const li = M.LISTING(l.listing), pr = li && M.PRODUCTS.find(x => x.id === li.product); return { id: l.id, listing: l.listing, name: pr?.name, cat: pr?.cat, sub: pr?.sub, market: l.market, marketName: M.MARKET(l.market)?.name, price: li?.sale, rate: afRate(pr?.cat), link: `https://bizsim.example/a/${l.code}`, clicks: l.clicks, orders: l.orders, earn: l.earn }; });
    const days = db.prepare('SELECT day, SUM(clicks) AS clicks, SUM(orders) AS orders, SUM(earn) AS earn FROM af_days WHERE visitor=? AND day>? GROUP BY day').all(v, today - 14), chart = []; for (let d = today - 13; d <= today; d++) { const r = days.find(x => x.day === d); chart.push({ day: d, clicks: r?.clicks || 0, orders: r?.orders || 0, earn: r?.earn || 0 }); }
    const tot = db.prepare('SELECT COALESCE(SUM(clicks),0) AS clicks, COALESCE(SUM(orders),0) AS orders, COALESCE(SUM(earn),0) AS earn FROM af_days WHERE visitor=?').get(v);
    res.json({ ok: true, joined: true, since: a.since_day, audience: a.audience, balance: a.bal, paid: a.paid, minWithdraw: 25000, totals: tot, links, chart, maxLinks: 12 });
  }));
  app.post('/api/aff/join', afGuard(({ p, v, clk, res, a }) => { if (a) bad('Kamu sudah terdaftar sebagai affiliate.', 409); if (X.ageOk && !X.ageOk(p, clk)) bad('Minimal 17 tahun.'); db.prepare('INSERT INTO af_accounts (visitor, since_day, last_tick) VALUES (?,?,?)').run(v, clk.day, clk.day); res.json({ ok: true, msg: 'Terdaftar sebagai affiliate. Pilih produk untuk dipromosikan.' }); }));
  app.get('/api/aff/catalog', afGuard(({ req, res }) => {
    const q = str(req.query.q, 40).toLowerCase(), mk = M.MARKET(req.query.market) ? req.query.market : null, cat = M.CATEGORIES.some(c => c.id === req.query.cat) ? req.query.cat : null;
    const out = M.LISTINGS.filter(l => (!mk || l.market === mk)).map(l => { const pr = M.PRODUCTS.find(x => x.id === l.product); return { l, pr }; }).filter(({ pr }) => (!cat || pr.cat === cat) && (!q || pr.name.toLowerCase().includes(q) || pr.brand.toLowerCase().includes(q))).sort((a, b) => b.l.sold - a.l.sold).slice(0, 30)
      .map(({ l, pr }) => ({ listing: l.id, name: pr.name, brand: pr.brand, cat: pr.cat, sub: pr.sub, market: l.market, marketName: M.MARKET(l.market).name, price: l.sale, rate: afRate(pr.cat), commission: Math.round(l.sale * afRate(pr.cat)), rating: l.rating, sold: l.sold })); res.json({ ok: true, items: out });
  }));
  app.post('/api/aff/link', afGuard(({ v, clk, req, res, a }) => {
    if (!a) bad('Daftar affiliate dulu.', 403); const li = M.LISTING(req.body?.listing); if (!li) bad('Produk tidak ditemukan.', 404);
    if (db.prepare('SELECT 1 FROM af_links WHERE visitor=? AND listing=? AND active=1').get(v, li.id)) bad('Produk ini sudah ada di daftar promosimu.', 409);
    if (db.prepare('SELECT COUNT(*) AS n FROM af_links WHERE visitor=? AND active=1').get(v).n >= 12) bad('Maksimal 12 tautan aktif.');
    const code = (li.market.slice(0, 2) + hf(v, li.id) * 1e9).toString(36).replace('.', '').slice(0, 8).toUpperCase().padEnd(6, 'X'); db.prepare('INSERT INTO af_links (id, visitor, listing, market, code, created_day) VALUES (?,?,?,?,?,?)').run(rid('afl'), v, li.id, li.market, code, clk.day);
    res.json({ ok: true, msg: 'Tautan afiliasi simulasi dibuat. Komisi dihitung dari penjualan simulasi, bukan lalu lintas internet nyata.' });
  }));
  app.post('/api/aff/link/:id/remove', afGuard(({ v, req, res }) => { const r = db.prepare('UPDATE af_links SET active=0 WHERE id=? AND visitor=?').run(req.params.id, v); if (!r.changes) bad('Tautan tidak ditemukan.', 404); res.json({ ok: true }); }));
  app.post('/api/aff/withdraw', guard(afGuard(({ p, v, clk, req, res, a }) => {
    const b = req.body || {}; if (!a) bad('Daftar affiliate dulu.', 403); if (!idemOk(b.idem)) bad('Kunci transaksi tidak valid.'); const dup = findIdem(v, 'afw:' + b.idem); if (dup) return res.json({ ...dup, duplicate: true });
    if (a.bal < 25000) bad(`Saldo komisi minimal Rp 25.000 untuk dicairkan (sekarang ${fmtRp(a.bal)}).`); let out;
    dbTx(() => {
      const r0 = db.prepare('UPDATE af_accounts SET bal=bal-?, paid=paid+? WHERE visitor=? AND bal>=?').run(a.bal, a.bal, v, a.bal); if (!r0.changes) bad('Saldo berubah, coba lagi.');
      const c = creditIn(p, { amount: a.bal, idem: 'afw:' + b.idem, kind: 'komisi', label: `Pencairan komisi affiliate`, account: b.account || 'cash', day: clk.day, sec: clk.sec % 86400 });
      if (c.error) bad(c.error); out = { ...finView(p, clk.abs), ok: true, withdrawn: a.bal, msg: `Komisi ${fmtRp(a.bal)} dicairkan ke ${c.account === 'cash' ? 'uang tunai' : 'rekening'}.` };
      notif(v, 'afw-' + b.idem.slice(0, 24), 'af_pay', 'Komisi affiliate diterima', `${fmtRp(a.bal)} masuk ke Keuangan.`, clk.abs); db.prepare('UPDATE fin_tx SET resp=? WHERE visitor=? AND idem=?').run(JSON.stringify(out), v, 'afw:' + b.idem);
    })(); res.json(out);
  })));
  app.get('/api/sell/promos', wrap(({ v, clk, res }) => {
    const today = dayOfAbs(clk.abs), out = []; for (const pr of db.prepare("SELECT id, name FROM sl_prods WHERE visitor=? AND deleted=0").all(v)) for (let d = today; d > today - 6; d--) { const n = npcPromoOf(pr.id, d); if (n) out.push({ day: d, prod: pr.name, who: n.who, boost: Math.round((n.mult - 1) * 100) }); }
    res.json({ ok: true, items: out.sort((a, b) => b.day - a.day).slice(0, 10) });
  }, { shop: true }));

  // ————————————————————————— P8: chat —————————————————————————
  const msg = (t, who, text, abs, opts) => db.prepare('INSERT INTO ch_msgs (thread, visitor, who, text, abs, opts) VALUES (?,?,?,?,?,?)').run(t.id || t, t.visitor || null, who, text, Math.round(abs), opts ? JSON.stringify(opts) : null);
  const QR = { nego: [['accept', 'Setujui harga'], ['counter', 'Ajukan harga lain'], ['decline', 'Tolak dengan sopan']], ship: [['resi', 'Cek status & resi'], ['soon', 'Sedang saya proses'], ['sorry', 'Mohon maaf atas keterlambatan']], complaint: [['apologize', 'Minta maaf & bantu cek'], ['resi', 'Kirim info resi'], ['refund', 'Tawarkan pengembalian dana']], buyer: [['produk', 'Tanya spesifikasi'], ['stok', 'Tanya stok'], ['kirim', 'Tanya pengiriman'], ['nego', 'Nego harga'], ['komplain', 'Kirim komplain']], open: [['thanks', 'Terima kasih'], ['ask', 'Ada yang bisa dibantu?']] };
  const optsFor = th => th.kind === 'listing' ? QR.buyer : th.state === 'nego' ? QR.nego : th.state === 'ship' ? QR.ship : th.state === 'complaint' ? QR.complaint : QR.open;
  function newThread(v, kind, ref, title, npc, state, abs, meta) { const id = rid('chat'); db.prepare('INSERT INTO ch_threads (id, visitor, kind, ref, title, npc, state, created_abs, last_abs, unread, pending, meta) VALUES (?,?,?,?,?,?,?,?,?,?,?,?)').run(id, v, kind, ref, title, npc, state, abs, abs, 1, 1, JSON.stringify(meta || {})); return db.prepare('SELECT * FROM ch_threads WHERE id=?').get(id); }
  const OPEN_O = ['baru', 'dikemas', 'dikirim', 'terkirim'];
  // NPC pembeli menghubungi penjual (pemain) berdasarkan pesanan nyata: nego (bila produk mengizinkan), tanya kirim, komplain keterlambatan.
  hooks.after = (p, shop, abs) => {
    const v = p.visitor; let made = 0;
    for (const o of db.prepare("SELECT o.*, pr.nego FROM sl_orders o LEFT JOIN sl_prods pr ON pr.id=o.prod WHERE o.visitor=? AND o.status IN ('baru','dikemas','dikirim','terkirim') AND o.created_abs>? ORDER BY o.created_abs DESC LIMIT 60").all(v, abs - 10 * DAY)) {
      if (made >= 8) break; if (db.prepare("SELECT 1 FROM ch_threads WHERE visitor=? AND kind='order' AND ref=?").get(v, o.id)) continue; if (hf(o.id, 'ask') > 0.32) continue;
      let state = 'ship', text = `Halo kak, pesanan ${o.name} kapan dikirim ya?`, meta = { order: o.id }; const at = o.created_abs + 1200 + Math.floor(hf(o.id, 'at') * 6000);
      if (o.nego && o.status === 'baru' && hf(o.id, 'ng') < 0.6) { const offer = Math.max(500, Math.round(o.unit * (0.86 + hf(o.id, 'off') * 0.08) / 100) * 100); state = 'nego'; text = `Halo kak, boleh nego ${o.name} jadi ${fmtRp(offer)} per pcs? Saya ambil ${o.qty}.`; meta = { order: o.id, offer, unit: o.unit }; }
      else if (o.status === 'dikirim' && o.deliver_abs - o.ship_abs >= 3 * DAY && abs > o.ship_abs + 2 * DAY) { state = 'complaint'; text = `Kak, paket ${o.name} kok lama sekali belum sampai? Tolong dicek.`; }
      else if (o.status === 'terkirim' || o.status === 'dikirim' && abs < o.ship_abs + DAY) continue;
      if (at > abs) continue; const t = newThread(v, 'order', o.id, `${o.buyer} · ${o.name}`, o.buyer, state, at, meta); msg(t, 'npc', text, at, optsFor(t)); notif(v, t.id, 'sl_chat', 'Pesan dari pembeli', `${o.buyer}: ${text.slice(0, 70)}`, at); made++;
    }
    // Penalti respons lambat: pesan pembeli tidak dibalas >2 hari simulasi.
    for (const t of db.prepare("SELECT * FROM ch_threads WHERE visitor=? AND kind='order' AND pending=1 AND penal=0 AND last_abs<?").all(v, abs - 2 * DAY)) { db.prepare('UPDATE ch_threads SET penal=1 WHERE id=?').run(t.id); db.prepare('UPDATE sl_shops SET rep=MAX(5, rep-1) WHERE visitor=?').run(v); msg(t, 'npc', 'Penjualnya lama membalas, saya beri catatan di penilaian layanan.', t.last_abs + 2 * DAY, null); }
  };
  const cleanText = text => { const t = str(text, 300); if (t.length < 2) return { error: 'Tulis pesan minimal 2 karakter.' }; if (BAD.test(t) || THREAT.test(t)) return { error: 'Pesan mengandung kata kasar atau ancaman. Coba kalimat yang lebih sopan, mis. "Mohon maaf atas ketidaknyamanannya, saya bantu cek ya."' }; return { t }; };
  const classify = t => { const s = t.toLowerCase(); return /resi|kirim|ongkir|ekspedisi|sampai|tiba/.test(s) ? 'ship' : /stok|ready|tersedia/.test(s) ? 'stock' : /nego|kurang|diskon|murah|tawar/.test(s) ? 'nego' : /maaf|sorry/.test(s) ? 'sorry' : /terima kasih|makasih|thanks/.test(s) ? 'thanks' : /halo|hai|selamat|assalam/.test(s) ? 'hi' : /spesifikasi|bahan|ukuran|berat|merek|garansi/.test(s) ? 'spec' : 'other'; };
  const thOut = (t, last) => ({ id: t.id, kind: t.kind, title: t.title, npc: t.npc, state: t.state, unread: t.unread, pending: !!t.pending, lastAbs: t.last_abs, last: last || null });
  app.get('/api/chat/threads', wrap(({ p, v, clk, res }) => {
    X.shopOf(v) && SL.X.refresh(p, clk.abs);
    const rows = db.prepare('SELECT * FROM ch_threads WHERE visitor=? ORDER BY last_abs DESC LIMIT 60').all(v);
    res.json({ ok: true, threads: rows.map(t => thOut(t, db.prepare('SELECT text, who FROM ch_msgs WHERE thread=? ORDER BY id DESC LIMIT 1').get(t.id))), unread: rows.reduce((s, t) => s + (t.unread ? 1 : 0), 0) });
  }));
  app.get('/api/chat/:id', wrap(({ v, req, res }) => {
    const t = db.prepare('SELECT * FROM ch_threads WHERE id=? AND visitor=?').get(req.params.id, v); if (!t) bad('Percakapan tidak ditemukan.', 404); db.prepare('UPDATE ch_threads SET unread=0 WHERE id=?').run(t.id);
    const msgs = db.prepare('SELECT id, who, text, abs, opts FROM ch_msgs WHERE thread=? ORDER BY id DESC LIMIT 60').all(t.id).reverse().map(m => ({ ...m, opts: undefined })); const meta = parse(t.meta, {});
    res.json({ ok: true, thread: thOut(t), messages: msgs, quick: optsFor(t).map(([k, l]) => ({ k, l })), meta: { offer: meta.offer, unit: meta.unit, listing: meta.listing, order: meta.order } });
  }));
  app.post('/api/chat/start', wrap(({ p, v, clk, req, res }) => {
    const li = M.LISTING(req.body?.listing); if (!li) bad('Produk tidak ditemukan.', 404); const sl = M.SELLER(li.seller), pr = M.PRODUCTS.find(x => x.id === li.product);
    const ex = db.prepare("SELECT * FROM ch_threads WHERE visitor=? AND kind='listing' AND ref=?").get(v, li.id); if (ex) return res.json({ ok: true, id: ex.id });
    const t = newThread(v, 'listing', li.id, `${sl.name} · ${pr.name}`, sl.name, 'open', clk.abs, { listing: li.id }); db.prepare('UPDATE ch_threads SET unread=0, pending=0 WHERE id=?').run(t.id); msg(t, 'npc', `Halo, selamat datang di ${sl.name}. Ada yang bisa kami bantu soal ${pr.name}?`, clk.abs, null);
    res.json({ ok: true, id: t.id });
  }));
  function reply(p, t, text, kind, abs, body) {
    const v = p.visitor, meta = parse(t.meta, {}); let who = 'npc', out = [], newState = t.state, effect = null;
    const o = t.kind === 'order' ? db.prepare('SELECT * FROM sl_orders WHERE id=? AND visitor=?').get(t.ref, v) : null;
    const say = s => out.push(s);
    if (t.kind === 'order' && o) {
      const pr = db.prepare('SELECT * FROM sl_prods WHERE id=?').get(o.prod), cr = M.COURIER(o.courier);
      if (t.state === 'nego' && ['accept', 'counter', 'decline'].includes(kind)) {
        if (!['baru', 'dikemas'].includes(o.status)) say('Pesanan sudah dikirim, jadi harga tidak bisa diubah ya kak.');
        else if (kind === 'accept') { const gross = meta.offer * o.qty, fee = Math.round((gross - o.voucher) * COMMISSION[o.market]); db.prepare('UPDATE sl_orders SET unit=?, gross=?, fee=?, source=? WHERE id=? AND status IN (\'baru\',\'dikemas\')').run(meta.offer, gross, fee, 'nego', o.id); ev(v, o.id, abs, 'nego', `Harga disepakati ${fmtRp(meta.offer)}/pcs lewat chat.`); say(`Siap kak, terima kasih! Harga ${fmtRp(meta.offer)} per pcs ya.`); newState = 'open'; effect = 'accepted'; }
        else if (kind === 'decline') { say(hf(o.id, 'dc') < 0.35 ? 'Baik kak, saya batalkan saja kalau begitu.' : 'Baik kak, saya ikut harga semula.'); newState = 'open'; if (/batalkan/.test(out[0])) { db.prepare("UPDATE sl_orders SET status='dibatalkan', done_abs=?, note='Pembeli membatalkan setelah nego ditolak' WHERE id=? AND status IN ('baru','dikemas')").run(abs, o.id); db.prepare('UPDATE sl_prods SET stock=stock+?, sold=MAX(0,sold-?) WHERE id=?').run(o.qty, o.qty, o.prod); effect = 'cancelled'; } }
        else { const price = intIn(body.price, 500, 500_000_000); if (price == null) return { error: 'Masukkan harga tawaran yang valid.' }; const floor = Math.round(o.unit * 0.8);
          if (price < pr.cost) return { error: 'Harga tawaranmu di bawah modal. Kamu akan rugi per unit.' }; if (price >= meta.offer || hf(o.id, 'ct') < 0.5 + (price - meta.offer) / Math.max(1, o.unit) * 2) { const gross = price * o.qty, fee = Math.round((gross - o.voucher) * COMMISSION[o.market]); db.prepare("UPDATE sl_orders SET unit=?, gross=?, fee=?, source='nego' WHERE id=? AND status IN ('baru','dikemas')").run(price, gross, fee, o.id); ev(v, o.id, abs, 'nego', `Harga disepakati ${fmtRp(price)}/pcs lewat tawar-menawar.`); say(`Oke kak, ${fmtRp(price)} deal!`); newState = 'open'; effect = 'accepted'; } else { say(`Waduh kak, ${fmtRp(price)} masih berat. Paling banyak ${fmtRp(Math.max(meta.offer, Math.round((meta.offer + price) / 2 / 100) * 100))} ya.`); } }
      } else {
        const intent = kind && ['resi', 'soon', 'sorry', 'apologize', 'refund', 'thanks', 'ask'].includes(kind) ? ({ resi: 'ship', soon: 'soon', sorry: 'sorry', apologize: 'sorry', refund: 'refund', thanks: 'thanks', ask: 'hi' })[kind] : classify(text || '');
        if (intent === 'ship') say(o.resi ? `Terima kasih kak. Resi ${o.resi} (${cr?.name}), estimasi tiba dalam beberapa hari. Saya pantau ya.` : 'Belum ada resi kak, mohon segera diproses ya.');
        else if (intent === 'soon') say('Baik kak, saya tunggu kabar resinya ya.'); else if (intent === 'sorry') { say('Tidak apa-apa kak, mohon dibantu secepatnya ya.'); effect = 'calm'; } else if (intent === 'refund') { say('Kalau memang tidak bisa dikirim, saya minta dana dikembalikan saja kak.'); }
        else if (intent === 'thanks') say('Sama-sama kak!'); else if (intent === 'hi') say('Halo kak! Saya tunggu pesanannya ya.'); else if (intent === 'stock') say(`Stok ${o.name} sudah kakak pegang ya, tinggal pengiriman.`); else if (intent === 'spec') say(`Sesuai deskripsi: ${pr?.descr?.slice(0, 120) || 'lihat halaman produk'}.`);
        else if (intent === 'nego') say(t.state === 'nego' ? 'Silakan pilih setuju, tawar lagi, atau tolak ya kak.' : 'Untuk pesanan ini harga sudah final ya kak.'); else say('Baik kak, terima kasih infonya.');
        if (t.state === 'complaint' || t.state === 'ship') { newState = intent === 'ship' || intent === 'soon' || intent === 'sorry' ? 'open' : t.state; }
      }
      if (t.pending && abs - t.last_abs <= DAY && !meta.rewarded) { db.prepare('UPDATE sl_shops SET rep=MIN(100, rep+0.3) WHERE visitor=?').run(v); meta.rewarded = 1; }
    } else if (t.kind === 'listing') {
      const inf = MKT.info(v, t.ref, Math.floor(abs / DAY) - WARM, p.profile.city); if (!inf) return { error: 'Produk tidak lagi tersedia.' };
      const intent = kind && ['produk', 'stok', 'kirim', 'nego', 'komplain'].includes(kind) ? kind : ({ spec: 'produk', stock: 'stok', ship: 'kirim', nego: 'nego', other: 'other', hi: 'hi', thanks: 'thanks', sorry: 'komplain' })[classify(text || '')] || 'other';
      if (intent === 'produk') say(`${inf.prod.name} (${inf.prod.brand}). Berat ${inf.prod.weightG} g, dimensi ${inf.prod.dim} cm. ${inf.prod.desc}`);
      else if (intent === 'stok') say(inf.stock > 0 ? `Stok ${inf.prod.name} saat ini tersedia ${inf.stock} unit.` : 'Mohon maaf, stok sedang habis. Stok akan terisi ulang beberapa hari lagi.');
      else if (intent === 'kirim') say(`Dikirim dari ${inf.seller.city} ke ${p.profile.city} (${inf.km} km). Estimasi ${inf.eta} hari dengan reguler, ongkir mulai ${fmtRp(inf.fee)}. Pilih ekspedisi saat checkout.`);
      else if (intent === 'nego') say(`Harga di ${inf.market.name} sudah ditetapkan sistem, jadi belum bisa nego. Coba pakai voucher marketplace saat checkout ya.`);
      else if (intent === 'komplain') say('Mohon maaf atas ketidaknyamanannya. Untuk pesanan bermasalah, ajukan pengembalian dari Order Center agar dana bisa diproses. Kami catat keluhanmu.');
      else if (intent === 'thanks') say('Sama-sama, selamat berbelanja!'); else if (intent === 'hi') say('Halo! Silakan tanya soal produk, stok, atau pengiriman.'); else say('Maaf, saya belum paham. Coba pilih salah satu pertanyaan cepat di bawah ya.');
    } else say('Percakapan ini sudah selesai.');
    return { out, newState, meta, effect };
  }
  app.post('/api/chat/:id/send', guard(wrap(({ p, v, clk, req, res }) => {
    const b = req.body || {}; const t = db.prepare('SELECT * FROM ch_threads WHERE id=? AND visitor=?').get(req.params.id, v); if (!t) bad('Percakapan tidak ditemukan.', 404);
    if (b.idem) { if (!idemOk(b.idem)) bad('Kunci tidak valid.'); const dup = db.prepare("SELECT 1 FROM ch_msgs WHERE thread=? AND opts=?").get(t.id, JSON.stringify({ idem: b.idem })); if (dup) return res.json({ ok: true, duplicate: true }); }
    const quick = typeof b.quick === 'string' ? b.quick : null, allowed = optsFor(t).map(x => x[0]); if (quick && !allowed.includes(quick)) bad('Pilihan balasan tidak tersedia pada percakapan ini.');
    let text = '', label = null; if (quick) label = optsFor(t).find(x => x[0] === quick)[1]; else { const c = cleanText(b.text); if (c.error) bad(c.error); text = c.t; }
    const shown = quick === 'counter' && b.price ? `Bagaimana kalau ${fmtRp(Number(b.price) || 0)}?` : label || text;
    let r; dbTx(() => {
      r = reply(p, t, text, quick, clk.abs, b); if (r.error) bad(r.error);
      db.prepare('INSERT INTO ch_msgs (thread, visitor, who, text, abs, opts) VALUES (?,?,?,?,?,?)').run(t.id, v, 'me', shown, clk.abs, b.idem ? JSON.stringify({ idem: b.idem }) : null);
      const at = clk.abs + 60 + Math.floor(hf(t.id, clk.abs, 'dly') * 240); for (const s of r.out) msg(t, 'npc', s, at, null);
      db.prepare('UPDATE ch_threads SET state=?, last_abs=?, pending=0, unread=0, meta=? WHERE id=?').run(r.newState, at, JSON.stringify(r.meta), t.id);
    })();
    res.json({ ok: true, effect: r.effect });
  })));

  // ————————————————————————— P8: ulasan pembeli (pemain membeli di marketplace) —————————————————————————
  const NPC_REV = { 5: ['Barang sesuai, pengemasan rapi.', 'Mantap, cepat sampai.'], 4: ['Bagus, sesuai harga.', 'Kualitas oke, pengiriman lumayan.'], 3: ['Biasa saja, sesuai harga.'], 2: ['Kurang sesuai harapan.'], 1: ['Mengecewakan, tidak sesuai deskripsi.'] };
  app.get('/api/mp/reviews/:listing', wrap(({ v, req, res }) => {
    const li = M.LISTING(req.params.listing); if (!li) bad('Produk tidak ditemukan.', 404); const items = [];
    for (let i = 0; i < 4; i++) { const st = clamp(Math.round(li.rating + (hf(li.id, i, 'rs') - 0.5) * 1.8), 1, 5), pool = NPC_REV[st]; items.push({ who: `${['Adi', 'Sari', 'Budi', 'Lina', 'Eko', 'Putri'][Math.floor(hf(li.id, i, 'rn') * 6)]} ${['S.', 'W.', 'P.', 'H.'][Math.floor(hf(li.id, i, 'rl') * 4)]}`, stars: st, text: pool[Math.floor(hf(li.id, i, 'rt') * pool.length)], mine: false }); }
    const mine = db.prepare('SELECT stars, text, quality, ship, service, photo FROM rv_buyer WHERE visitor=? AND listing=?').all(v, li.id).map(r => ({ who: 'Kamu', ...r, mine: true })); res.json({ ok: true, rating: li.rating, count: li.reviews, items: [...mine, ...items] });
  }));
  app.post('/api/mp/review', guard(wrap(({ v, clk, req, res }) => {
    const b = req.body || {}, o = db.prepare('SELECT * FROM shop_orders WHERE id=? AND visitor=?').get(b.order, v); if (!o || !o.store.startsWith('mp-')) bad('Pesanan marketplace tidak ditemukan.', 404);
    if (o.ful_status !== 'completed') bad('Ulasan hanya bisa diberikan setelah pesanan diterima.'); if (db.prepare('SELECT 1 FROM rv_buyer WHERE order_id=?').get(o.id)) bad('Pesanan ini sudah diulas.', 409);
    const st = intIn(b.stars, 1, 5), q = intIn(b.quality ?? b.stars, 1, 5), sh = intIn(b.ship ?? b.stars, 1, 5), sv = intIn(b.service ?? b.stars, 1, 5); if ([st, q, sh, sv].includes(null)) bad('Beri nilai bintang 1–5.');
    const text = str(b.text, 400); if (BAD.test(text)) bad('Ulasan mengandung kata kasar. Mohon gunakan bahasa yang sopan.'); let photo = ''; if (b.photo) { if (String(b.photo).length > 180000 || !/^data:image\/(png|jpeg|webp);base64,[A-Za-z0-9+/=]+$/.test(b.photo)) bad('Foto harus PNG/JPEG/WebP maksimal ±130 KB.'); photo = b.photo; }
    const lines = parse(o.lines, []), lid = String(lines[0]?.id || '').replace(/^mp:/, ''), meta = db.prepare('SELECT seller FROM mp_order_meta WHERE order_id=?').get(o.id);
    db.prepare('INSERT INTO rv_buyer (order_id, visitor, listing, seller, stars, quality, ship, service, text, photo, abs) VALUES (?,?,?,?,?,?,?,?,?,?,?)').run(o.id, v, lid, meta?.seller || null, st, q, sh, sv, text, photo, clk.abs);
    res.json({ ok: true, msg: 'Terima kasih! Ulasanmu tampil di halaman produk.' });
  })));
  CM.hooks.decorate.push((o, out) => { if (!o.store.startsWith('mp-')) return; const r = db.prepare('SELECT stars, text, quality, ship, service, photo FROM rv_buyer WHERE order_id=?').get(o.id); out.review = r || null; out.canReview = o.ful_status === 'completed' && !r; });

  // ————————————————————————— P8: retur & refund sisi penjual —————————————————————————
  const hist = (r, at, stage, text) => { r.stage = stage; r.at = at; (r.history ||= []).push({ at, stage, text }); };
  function retAdvance(p, shop, abs) {
    const v = p.visitor;
    for (const o of db.prepare("SELECT * FROM sl_orders WHERE visitor=? AND status='retur'").all(v)) {
      const r = parse(o.ret, null); if (!r) continue; let changed = false;
      for (let guardN = 0; guardN < 5; guardN++) {
        if (r.stage === 'diajukan' && abs >= r.at + 3 * DAY) { const t = r.at + 3 * DAY; hist(r, t, 'disetujui', 'Disetujui otomatis: penjual tidak menanggapi dalam 3 hari.'); db.prepare('UPDATE sl_shops SET rep=MAX(5,rep-1) WHERE visitor=?').run(v); changed = true; continue; }
        if (r.stage === 'disetujui' && abs >= r.at + 3 * DAY) { hist(r, r.at + 3 * DAY, 'diterima_balik', 'Barang retur diterima penjual, sedang diperiksa.'); changed = true; continue; }
        if (r.stage === 'diterima_balik' && abs >= r.at + DAY) { const t = r.at + DAY; refundOrder(p, o, r, t, true); hist(r, t, 'refund', 'Dana dikembalikan kepada pembeli.'); changed = true; break; }
        if (r.stage === 'ditolak' && abs >= r.at + 2 * DAY) { const t = r.at + 2 * DAY, legit = clamp((r.reason === 'rusak' || r.reason === 'tidak_sesuai' ? 0.55 : 0.3) - 0.1 * (quality(db.prepare('SELECT * FROM sl_prods WHERE id=?').get(o.prod) || { cost: 0, sub: 'camilan' }) - 3), 0.1, 0.8);
          if (hf(o.id, 'disp') < legit) { hist(r, t, 'sengketa_pembeli', 'Sengketa: platform memenangkan pembeli. Dana dikembalikan.'); refundOrder(p, o, r, t, false); db.prepare('UPDATE sl_shops SET rep=MAX(5,rep-3) WHERE visitor=?').run(v); changed = true; break; }
          hist(r, t, 'sengketa_penjual', 'Sengketa: platform memenangkan penjual. Pesanan dinyatakan selesai.'); db.prepare("UPDATE sl_orders SET status='terkirim', ret=? WHERE id=?").run(JSON.stringify(r), o.id); X.completeOrder(p, shop, db.prepare('SELECT * FROM sl_orders WHERE id=?').get(o.id), t, true); db.prepare('UPDATE sl_shops SET rep=MIN(100,rep+0.5) WHERE visitor=?').run(v); changed = false; r.done = true; break; }
        break;
      }
      if (changed && !r.done) db.prepare('UPDATE sl_orders SET ret=? WHERE id=?').run(JSON.stringify(r), o.id);
    }
  }
  function refundOrder(p, o, r, t, goods) {
    const v = p.visitor; db.prepare("UPDATE sl_orders SET status='refund', done_abs=?, ret=? WHERE id=? AND status='retur'").run(t, JSON.stringify(r), o.id);
    if (goods && !['rusak', 'tidak_sesuai'].includes(r.reason)) db.prepare('UPDATE sl_prods SET stock=stock+?, sold=MAX(0,sold-?) WHERE id=?').run(o.qty, o.qty, o.prod);
    db.prepare('UPDATE sl_shops SET rep=MAX(5,rep-?) WHERE visitor=?').run(goods ? 2 : 0, v); ev(v, o.id, t, 'refund', `Refund ke pembeli (${X.RET_LABEL[r.reason]}). Tidak ada pencairan dana untuk pesanan ini.`);
    notif(v, o.id, 'sl_refund', 'Refund pembeli diproses', `${o.name}: ${X.RET_LABEL[r.reason]}. Pesanan tidak menghasilkan pendapatan.`, t);
  }
  const prevAfter = hooks.after; hooks.after = (p, shop, abs) => { prevAfter(p, shop, abs); retAdvance(p, shop, abs); };
  app.post('/api/sell/return/:id/:act', wrap(({ v, clk, req, res }) => {
    const o = X.ownOrder(v, req.params.id), r = parse(o.ret, null), act = req.params.act; if (o.status !== 'retur' || !r) bad('Tidak ada pengajuan pengembalian aktif untuk pesanan ini.');
    if (r.stage !== 'diajukan') bad('Pengajuan sudah ditanggapi.');
    if (act === 'approve') { hist(r, clk.abs, 'disetujui', 'Penjual menyetujui pengembalian. Pembeli mengirim barang kembali.'); db.prepare('UPDATE sl_orders SET ret=? WHERE id=?').run(JSON.stringify(r), o.id); ev(v, o.id, clk.abs, 'ret_setuju', 'Pengembalian disetujui penjual.'); return res.json({ ok: true, msg: 'Disetujui. Dana pembeli dikembalikan setelah barang diterima dan diperiksa.' }); }
    if (act === 'reject') { const note = str(req.body?.note, 150); if (note.length < 5) bad('Tulis alasan penolakan (min. 5 karakter).'); r.note = note; hist(r, clk.abs, 'ditolak', `Penjual menolak: ${note}. Pembeli dapat mengajukan sengketa ke platform.`); db.prepare('UPDATE sl_orders SET ret=? WHERE id=?').run(JSON.stringify(r), o.id); ev(v, o.id, clk.abs, 'ret_tolak', `Pengembalian ditolak penjual: ${note}`); return res.json({ ok: true, msg: 'Ditolak. Pembeli akan mengajukan sengketa; keputusan platform keluar 2 hari simulasi.' }); }
    bad('Aksi tidak dikenal.');
  }, { shop: true }));
  return { migrate, reset };
};
