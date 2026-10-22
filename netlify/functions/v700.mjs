// BizSim 7.0.0 additive layer: routes + catch-up. State lives in s.v700. SIMULATION ONLY.
import { rngFor, clamp, R, PLATFORMS, platformQuality } from './v655.mjs';
import { livePxStock, livePxTrade } from './v730-live.mjs';
import { ensure, processDay, refreshListings, genCandidate, meta, lotOf, roundPx, last, fmt, logTx, bondPrice, depositRate, propValue, collValue, bonusOf, insured, news, secOf, VERSION } from './v700-engine.mjs';
import * as D from './v700-data.mjs';
const { STOCKS, TRADE, BONDS, FUNDS, PROPERTY, SHOP, TRAITS, FLAWS, ROLES, QUESTIONS, INTERVIEW, CONTENT, DEPOSIT_TENORS, BRANDS, CREATOR_THEME } = D;
export { VERSION };

export function catchup(s, userId, h) {
  const fresh = !s.v700, v = ensure(s, userId); let changed = fresh; const hh = { ...h, userId };
  if (s.day > v.lastDay) { for (let d = Math.max(v.lastDay + 1, s.day - 120); d <= s.day; d++) processDay(s, v, d, userId, hh); v.lastDay = s.day; changed = true; }
  if (!v.property.listings.length) { refreshListings(s, v, s.day, userId); changed = true; }
  return changed;
}
export function catalog() {
  return { version: VERSION, stocks: STOCKS, trade: TRADE, bonds: BONDS, funds: FUNDS, property: PROPERTY, depositTenors: DEPOSIT_TENORS, shop: SHOP, traits: TRAITS, flaws: FLAWS, roles: ROLES, questions: QUESTIONS, interview: INTERVIEW.map(q => ({ id: q.id, q: q.q, o: q.o.map(x => x[0]) })), content: CONTENT, creatorTheme: CREATOR_THEME, brands: BRANDS };
}
const holdCnt = (v, t) => v.holdings[t]?.shares || 0;
const tickerFor = (v, name) => { let t = (name.replace(/[^A-Za-z ]/g, '').split(' ').map(w => w[0]).join('') + 'XYZ').slice(0, 4).toUpperCase(); while (v.stocks[t] || v.ipos.some(x => x.t === t)) t = t.slice(0, 3) + String.fromCharCode(65 + Math.floor(Math.random() * 26)); return t; };

export async function route({ p, m, s, user, req, h }) {
  if (!p.startsWith('/api/v700/')) return null;
  const { json, body, clean, money, uid, save, addNotice, achievement, findBiz } = h, v = ensure(s, user.id), v6 = s.v655, b = m === 'POST' ? await body(req) : {};
  const err = (msg, c = 400) => json({ error: msg }, c), done = async d => { await save(user, s); return json(d); }, day = s.day, num = x => Number(x) || 0;
  if (m === 'GET' && p === '/api/v700/catalog') return json(catalog());
  if (m !== 'POST') return err('API_NOT_FOUND', 404);

  /* ================= SAHAM ================= */
  if (p === '/api/v700/stock/order') {
    const t = clean(b.t, 8), mt = meta(v, t), st = v.stocks[t]; if (!mt || !st || st.status !== 'listed') return err('Saham tidak tersedia.', 404);
    const lots = Math.floor(num(b.lots)), side = b.side === 'sell' ? 'sell' : 'buy'; if (lots < 1) return err('Jumlah lot minimal 1.'); const shares = lots * lotOf(mt), px = livePxStock(v, t);
    const limit = b.type === 'limit' ? roundPx(mt, num(b.limit)) : 0; if (b.type === 'limit' && (!limit || limit < px * .5 || limit > px * 1.5)) return err('Harga limit harus dalam rentang 50% sampai 150% harga saat ini.');
    if (side === 'buy') {
      const unit = limit || px, cost = shares * unit, bf = v.brokerFee?.buy ?? .0015, fee = Math.round(cost * bf); if (s.cash < cost + fee) return err('Cash personal tidak cukup.');
      if (limit && limit < px) { s.cash -= cost + fee; v.orders.push({ id: uid(), t, side, shares, limit, day, reserved: cost + fee }); return done({ ok: true, pending: true }); }
      s.cash -= shares * px + Math.round(shares * px * bf); const hd = v.holdings[t] || { shares: 0, cost: 0 }; hd.cost = (hd.cost * hd.shares + shares * px) / (hd.shares + shares); hd.shares += shares; v.holdings[t] = hd; logTx(v, { k: 'BUY', t, qty: shares, price: px, total: shares * px, fee: Math.round(shares * px * bf), day }); return done({ ok: true, price: px, fee: Math.round(shares * px * bf) });
    }
    const hd = v.holdings[t]; if (!hd || hd.shares < shares) return err('Jumlah saham yang dimiliki tidak cukup.');
    if (limit && limit > px) { hd.shares -= shares; if (!hd.shares) delete v.holdings[t]; v.orders.push({ id: uid(), t, side, shares, limit, day, reserved: 0, cost: hd.cost }); return done({ ok: true, pending: true }); }
    const gross = shares * px, fee = Math.round(gross * (v.brokerFee?.sell ?? .0035)), net = gross - fee, realized = Math.round(net - hd.cost * shares); hd.shares -= shares; if (!hd.shares) delete v.holdings[t]; v6.pendingCash.push({ amount: net, dueDay: day + 2, label: `Jual ${t}` });
    v.realized = (v.realized || 0) + realized; logTx(v, { k: 'SELL', t, qty: shares, price: px, total: gross, fee, realized, day });
    return done({ ok: true, net, fee, realized, settleDays: 2 });
  }
  if (p === '/api/v700/stock/cancel') {
    const o = v.orders.find(x => x.id === b.id); if (!o) return err('Order tidak ditemukan.', 404); v.orders = v.orders.filter(x => x !== o);
    if (o.side === 'buy') s.cash += o.reserved; else { const hd = v.holdings[o.t] || { shares: 0, cost: 0 }; hd.shares += o.shares; v.holdings[o.t] = hd; } return done({ ok: true });
  }
  if (p === '/api/v700/ipo/subscribe') {
    const ip = v.ipos.find(x => x.t === clean(b.t, 8) && x.status === 'open' && x.kind === 'game'); if (!ip) return err('IPO tidak dibuka.', 404); const lots = Math.floor(num(b.lots)); if (lots < 1) return err('Minimal 1 lot.');
    const cost = lots * 100 * ip.price; if (s.cash < cost) return err('Cash personal tidak cukup.'); s.cash -= cost; ip.sub.lots += lots; return done({ ok: true, paid: cost });
  }
  if (p === '/api/v700/ipo/prepare') {
    const biz = findBiz(s, b.businessId); if (!biz) return err('Business tidak ditemukan.', 404); if (biz.v700?.ipo || v.ipos.some(x => String(x.bizId) === String(biz.id) && x.status !== 'listed')) return err('Bisnis ini sudah go public atau sedang proses IPO.');
    if (biz.value < 500e6) return err('Nilai bisnis minimal Rp500 juta untuk IPO.'); if ((biz.reputation || 0) < 50) return err('Reputasi bisnis minimal 50.'); if (biz.cash < 25e6) return err('Kas bisnis minimal Rp25 juta untuk biaya pencatatan.');
    const pct = clamp(num(b.offerPct) || 20, 10, 40), price = 1000, total = Math.max(1000, Math.round(biz.value * 1.4 / price / 100) * 100), offer = Math.floor(total * pct / 100 / 100) * 100, t = tickerFor(v, biz.name);
    biz.cash -= 25e6; const mt = { t, n: `${biz.name} Tbk`, sec: secOf(biz.type), c: 'ID', p: price, beta: 1, vol: .35, mu: .08, div: 0, cap: Math.round(biz.value * 1.4 / 1e9), d: 'Perusahaan milik Anda yang tercatat di bursa.', own: 1, bizId: biz.id, shares: total };
    const hype = clamp(.5 + (biz.reputation || 0) / 100 + (biz.revenue > biz.expenses ? .4 : 0), .3, 2);
    v.ipos.push({ t, kind: 'own', bizId: biz.id, n: mt.n, sec: mt.sec, price, lots: offer / 100, offerShares: offer, totalShares: total, openDay: day, closeDay: day + 4, listDay: day + 6, hype: Math.round(hype * 100) / 100, quality: .55, status: 'open', sub: { lots: 0 }, meta: mt });
    news(v, day, 'ipo', `${mt.n} mengajukan IPO`, `Ticker ${t}, harga ${fmt(price)}, menawarkan ${pct}% saham. Pencatatan hari ${day + 6}.`, 'up', { ticker: t }); return done({ ok: true, ticker: t, total, offer, listDay: day + 6 });
  }
  if (p === '/api/v700/ipo/dividend') {
    const biz = findBiz(s, b.businessId), ip = biz?.v700?.ipo; if (!ip) return err('Bisnis belum go public.'); const per = num(b.perShare); if (per <= 0) return err('Dividen per saham tidak valid.');
    const total = per * ip.totalShares; if (total > biz.cash * .9) return err('Dividen maksimal 90% dari kas bisnis.'); const own = holdCnt(v, ip.t) + (ip.treasury || 0); biz.cash -= total; s.cash += Math.round(per * holdCnt(v, ip.t));
    const st = v.stocks[ip.t]; if (st) st.imp.push({ per: Math.min(.05, per / st.price) * .5 / 3, left: 3 }); news(v, day, 'stock', `${biz.name} membagikan dividen`, `${fmt(per)} per saham. Total ${fmt(total)}.`, 'up', { ticker: ip.t }); return done({ ok: true, total, yours: Math.round(per * holdCnt(v, ip.t)), own });
  }
  if (p === '/api/v700/ipo/buyback') {
    const biz = findBiz(s, b.businessId), ip = biz?.v700?.ipo, st = ip && v.stocks[ip.t]; if (!st) return err('Bisnis belum go public.'); const lots = Math.floor(num(b.lots)); if (lots < 1) return err('Minimal 1 lot.');
    const cost = Math.round(lots * 100 * st.price * 1.02); if (cost > biz.cash) return err('Kas bisnis tidak cukup.'); biz.cash -= cost; ip.treasury = (ip.treasury || 0) + lots * 100; st.imp.push({ per: Math.min(.05, lots * 100 / ip.totalShares * 2) / 3, left: 3 }); return done({ ok: true, cost });
  }

  /* ================= TRADING (leverage, long/short) ================= */
  if (p === '/api/v700/trade/open') {
    const a = TRADE.find(x => x.id === clean(b.asset, 10)); if (!a) return err('Instrumen tidak ditemukan.', 404); const dir = b.dir === 'short' ? -1 : 1, margin = Math.round(num(b.margin)), lev = Math.floor(num(b.lev) || 1);
    if (margin < 100000) return err('Margin minimal Rp100.000.'); if (lev < 1 || lev > a.lev) return err(`Leverage ${a.n} maksimal ${a.lev}x.`); if (v.trading.pos.length >= 6) return err('Maksimal 6 posisi terbuka.');
    const fee = Math.round(margin * lev * .001); if (s.cash < margin + fee) return err('Cash personal tidak cukup.'); const px = livePxTrade(v, a.id), entry = px * (1 + dir * .0005), sl = num(b.sl) || 0, tp = num(b.tp) || 0;
    if (sl && (dir > 0 ? sl >= entry : sl <= entry)) return err('Stop loss berada di sisi yang salah.'); if (tp && (dir > 0 ? tp <= entry : tp >= entry)) return err('Take profit berada di sisi yang salah.');
    s.cash -= margin + fee; const pos = { id: uid(), asset: a.id, dir, margin, lev, entry, sl, tp, openDay: day, fees: fee }; v.trading.pos.unshift(pos); return done({ ok: true, pos });
  }
  if (p === '/api/v700/trade/close') {
    const pos = v.trading.pos.find(x => x.id === b.id); if (!pos) return err('Posisi tidak ditemukan.', 404); const px = livePxTrade(v, pos.asset) * (1 - pos.dir * .0005);
    const pnl = pos.dir * (px / pos.entry - 1) * pos.margin * pos.lev - pos.fees, pay = Math.max(0, Math.round(pos.margin + pnl - pos.margin * pos.lev * .001)); s.cash += pay; v.trading.pos = v.trading.pos.filter(x => x !== pos);
    v.trading.closed.unshift({ asset: pos.asset, dir: pos.dir, pnl: Math.round(pnl), day, why: 'Manual', entry: pos.entry, exit: Math.round(px) }); v.trading.closed = v.trading.closed.slice(0, 30); return done({ ok: true, pnl: Math.round(pnl), pay });
  }
  if (p === '/api/v700/trade/edit') {
    const pos = v.trading.pos.find(x => x.id === b.id); if (!pos) return err('Posisi tidak ditemukan.', 404); const px = livePxTrade(v, pos.asset), sl = num(b.sl) || 0, tp = num(b.tp) || 0;
    if (sl && (pos.dir > 0 ? sl >= px : sl <= px)) return err('Stop loss berada di sisi yang salah.'); if (tp && (pos.dir > 0 ? tp <= px : tp >= px)) return err('Take profit berada di sisi yang salah.'); pos.sl = sl; pos.tp = tp; return done({ ok: true });
  }

  /* ================= OBLIGASI ================= */
  if (p === '/api/v700/bond/buy') {
    const def = BONDS.find(x => x.id === clean(b.bondId, 20)), amt = Math.round(num(b.amount)); if (!def) return err('Obligasi tidak ditemukan.', 404); if (amt < def.min) return err(`Minimum pembelian ${fmt(def.min)}.`); if (s.cash < amt) return err('Cash personal tidak cukup.');
    s.cash -= amt; const cpn = def.float ? Math.max(def.coupon, Math.round((v6.macro.rate + .15) * 100) / 100) : def.coupon; v.bonds.unshift({ id: uid(), bondId: def.id, amount: amt, cpn, buyDay: day, matureDay: day + def.tenor * 30, income: 0, status: 'active' }); return done({ ok: true });
  }
  if (p === '/api/v700/bond/sell') {
    const bd = v.bonds.find(x => x.id === b.id && x.status !== 'sold' && x.status !== 'matured'), def = bd && BONDS.find(x => x.id === bd.bondId); if (!bd) return err('Obligasi tidak ditemukan.', 404);
    const pr = bondPrice(def, bd, day, v6.macro), net = Math.round(bd.amount * pr / 100 * (1 - .002)); v6.pendingCash.push({ amount: net, dueDay: day + 2, label: `Jual ${def.n}` }); bd.status = 'sold'; return done({ ok: true, net, price: Math.round(pr * 100) / 100, realized: net - bd.amount });
  }

  /* ================= REKSADANA ================= */
  if (p === '/api/v700/fund/buy') {
    const f = FUNDS.find(x => x.id === clean(b.fundId, 20)), amt = Math.round(num(b.amount)); if (!f) return err('Reksadana tidak ditemukan.', 404); if (amt < f.min) return err(`Minimum pembelian ${fmt(f.min)}.`); if (s.cash < amt) return err('Cash personal tidak cukup.');
    s.cash -= amt; const u = v.funds.units[f.id] || { units: 0, invested: 0 }; u.units += amt / v.funds.nav[f.id]; u.invested += amt; u.last = day; v.funds.units[f.id] = u; return done({ ok: true, units: amt / v.funds.nav[f.id] });
  }
  if (p === '/api/v700/fund/sell') {
    const f = FUNDS.find(x => x.id === clean(b.fundId, 20)), u = f && v.funds.units[f.id]; if (!u || u.units <= 0) return err('Anda belum memiliki unit reksadana ini.'); const pct = clamp(num(b.percent) || 100, 1, 100) / 100, units = u.units * pct;
    const gross = units * v.funds.nav[f.id], fee = day - (u.last || 0) < 30 ? Math.round(gross * .005) : 0, net = Math.round(gross - fee), cost = u.invested * pct; u.units -= units; u.invested -= cost; if (u.units < 1e-6) delete v.funds.units[f.id]; v6.pendingCash.push({ amount: net, dueDay: day + f.settle, label: `Redeem ${f.n}` });
    return done({ ok: true, net, fee, settleDays: f.settle, realized: net - Math.round(cost) });
  }
  if (p === '/api/v700/fund/sip') {
    const f = FUNDS.find(x => x.id === clean(b.fundId, 20)); if (!f) return err('Reksadana tidak ditemukan.', 404); const amt = Math.round(num(b.amount)); v.funds.sip = v.funds.sip.filter(x => x.fundId !== f.id);
    if (amt > 0) { if (amt < f.min) return err(`Minimum SIP ${fmt(f.min)}.`); v.funds.sip.push({ fundId: f.id, amount: amt, nextDay: day + 30 }); } return done({ ok: true });
  }

  /* ================= EMAS ================= */
  if (p === '/api/v700/gold/buy') {
    const g = Math.round(num(b.grams) * 100) / 100; if (g < .1) return err('Minimal 0,1 gram.'); const price = v6.nav.gold * 1.025, cost = Math.round(g * price); if (s.cash < cost) return err('Cash personal tidak cukup.');
    s.cash -= cost; v.gold.cost += cost; v.gold.grams = Math.round((v.gold.grams + g) * 100) / 100; return done({ ok: true, cost, price: Math.round(price) });
  }
  if (p === '/api/v700/gold/sell') {
    const g = Math.round(num(b.grams) * 100) / 100; if (g < .1 || g > v.gold.grams + 1e-9) return err('Gram emas tidak cukup.'); const price = v6.nav.gold * .99, get = Math.round(g * price), avg = v.gold.cost / v.gold.grams;
    s.cash += get; v.gold.cost = Math.max(0, v.gold.cost - avg * g); v.gold.grams = Math.round((v.gold.grams - g) * 100) / 100; return done({ ok: true, get, realized: Math.round(get - avg * g) });
  }

  /* ================= PROPERTI ================= */
  if (p === '/api/v700/property/buy') {
    const l = v.property.listings.find(x => x.id === b.id); if (!l) return err('Listing tidak tersedia.', 404); const fee = Math.round(l.price * .025), cost = l.price + fee; if (s.cash < cost) return err(`Cash personal tidak cukup. Butuh ${fmt(cost)} termasuk biaya notaris dan pajak.`);
    s.cash -= cost; v.property.listings = v.property.listings.filter(x => x !== l); v.property.owned.unshift({ id: uid(), k: l.k, n: `${l.n} ${l.city}`, city: l.city, sz: l.sz, price: l.price, src: l.src, entryIdx: v6.nav[l.src], boughtDay: day, level: 0, income: 0 }); return done({ ok: true, fee });
  }
  if (p === '/api/v700/property/renovate') {
    const pr = v.property.owned.find(x => x.id === b.id); if (!pr) return err('Properti tidak ditemukan.', 404); if (pr.k === 'tanah') return err('Tanah tidak bisa direnovasi.'); if ((pr.level || 0) >= 10) return err('Level renovasi maksimum.');
    const cost = Math.round(propValue(v6, pr) * .08); if (s.cash < cost) return err(`Cash personal tidak cukup. Butuh ${fmt(cost)}.`); s.cash -= cost; pr.level = (pr.level || 0) + 1; return done({ ok: true, cost, level: pr.level });
  }
  if (p === '/api/v700/property/sell') {
    const pr = v.property.owned.find(x => x.id === b.id); if (!pr) return err('Properti tidak ditemukan.', 404); const val = propValue(v6, pr), net = Math.round(val * .95), wait = pr.k === 'tanah' ? 14 : 21 + (pr.k === 'gudang' || pr.k === 'ruko' ? 9 : 0);
    v.property.owned = v.property.owned.filter(x => x !== pr); v6.pendingCash.push({ amount: net, dueDay: day + wait, label: `Jual ${pr.n}` }); return done({ ok: true, net, settleDays: wait, realized: net - pr.price });
  }

  /* ================= DEPOSITO ================= */
  if (p === '/api/v700/deposit/open') {
    const tenor = Math.floor(num(b.tenor)), amt = Math.round(num(b.amount)); if (!DEPOSIT_TENORS.includes(tenor)) return err('Tenor tidak valid.'); if (amt < 5000000) return err('Minimum deposito Rp5.000.000.'); if (s.cash < amt) return err('Cash personal tidak cukup.');
    s.cash -= amt; v.deposits.unshift({ id: uid(), amount: amt, tenor, rate: depositRate(v6.macro, tenor), openDay: day, matureDay: day + tenor * 30, aro: Boolean(b.aro), status: 'active' }); return done({ ok: true });
  }
  if (p === '/api/v700/deposit/withdraw') {
    const dp = v.deposits.find(x => x.id === b.id && x.status === 'active'); if (!dp) return err('Deposito tidak ditemukan.', 404); const elapsed = (day - dp.openDay) / 30, interest = Math.round(dp.amount * dp.rate / 100 * elapsed / 12 * .8 * .5), pen = Math.round(dp.amount * .005);
    s.cash += dp.amount + interest - pen; dp.status = 'broken'; return done({ ok: true, interest, penalty: pen });
  }

  /* ================= SHOP ================= */
  if (p === '/api/v700/shop/buy') {
    const it = SHOP.find(x => x.id === clean(b.itemId, 20)); if (!it) return err('Barang tidak ditemukan.', 404); if (s.cash < it.p) return err('Cash personal tidak cukup.');
    if ((it.cat === 'Karier' || it.cat === 'Kreator' || it.slot) && v.inv.some(x => x.itemId === it.id)) return err('Barang ini sudah Anda miliki.');
    const rr = rngFor(`${user.id}:buy:${it.id}:${day}:${v.inv.length}`), ent = { id: uid(), itemId: it.id, cat: it.cat, name: it.n, price: it.p, boughtDay: day, value: it.p, k: 1, idx0: v.art.idx, fake: Boolean(it.col && rr() < it.col.fake) };
    if (it.sub) { v.inv = v.inv.filter(x => x.itemId !== it.id); ent.expires = day + it.sub; } s.cash -= it.p; v.inv.unshift(ent); v.bonus = bonusOf(v); return done({ ok: true, item: ent });
  }
  if (p === '/api/v700/shop/install') {
    const ent = v.inv.find(x => x.id === b.invId), it = ent && SHOP.find(x => x.id === ent.itemId), biz = findBiz(s, b.businessId); if (!ent || !it || it.cat !== 'Bisnis') return err('Peralatan tidak ditemukan.', 404); if (!biz) return err('Business tidak ditemukan.', 404); if (ent.installedIn) return err('Peralatan sudah terpasang.');
    if (!it.biz.includes('*') && !it.biz.includes(biz.catalogId)) return err(`Peralatan ini tidak cocok untuk ${biz.name}.`); if (v.inv.some(x => x.itemId === it.id && String(x.installedIn) === String(biz.id))) return err('Jenis peralatan ini sudah terpasang di bisnis tersebut.');
    const ops = biz.operations || (biz.operations = {}), prods = s.products.filter(x => String(x.business_id) === String(biz.id)), e = it.eff;
    if (e.quality) { ops.quality = Math.min(100, (ops.quality || 50) + e.quality); for (const x of prods) x.quality = Math.min(100, (x.quality || 50) + e.quality); }
    if (e.capacity) { ops.capacity = R((ops.capacity || 50) * (1 + e.capacity)); for (const x of prods) x.capacity = R(x.capacity * (1 + e.capacity)); }
    if (e.efficiency) for (const x of prods) x.unit_cost = R(x.unit_cost * (1 - e.efficiency)); ent.installedIn = biz.id; v.bonus = bonusOf(v); return done({ ok: true });
  }
  if (p === '/api/v700/shop/appraise') {
    const ent = v.inv.find(x => x.id === b.invId); if (!ent || !SHOP.find(x => x.id === ent.itemId)?.col) return err('Barang koleksi tidak ditemukan.', 404); const fee = Math.round(ent.price * .015); if (s.cash < fee) return err('Cash personal tidak cukup.');
    s.cash -= fee; ent.appraised = true; return done({ ok: true, fake: ent.fake, fee });
  }
  if (p === '/api/v700/shop/auction') {
    const ent = v.inv.find(x => x.id === b.invId), it = ent && SHOP.find(x => x.id === ent.itemId); if (!ent || !it?.col) return err('Barang koleksi tidak ditemukan.', 404); const rg = rngFor(`${user.id}:auc:${ent.id}:${day}`), hammer = Math.round(collValue(v, ent) * (.88 + rg() * .28)), net = Math.round(hammer * .88);
    v.inv = v.inv.filter(x => x !== ent); v6.pendingCash.push({ amount: net, dueDay: day + 5, label: `Lelang ${ent.name}` }); return done({ ok: true, hammer, net, realized: net - ent.price });
  }

  /* ================= HR: lowongan, kandidat, interview, hire ================= */
  if (p === '/api/v700/hr/vacancy') {
    const biz = findBiz(s, b.businessId); if (!biz) return err('Business tidak ditemukan.', 404); const cat = h.businessCatalog.find(x => x.id === biz.catalogId)?.category || 'generic', roles = ROLES[cat] || ROLES.generic, role = roles.includes(b.role) ? b.role : roles[0];
    if (biz.cash < 400000) return err('Kas bisnis tidak cukup untuk biaya iklan lowongan (Rp400.000).'); if (v.hr.vac.some(x => String(x.businessId) === String(biz.id) && x.role === role)) return err('Lowongan untuk posisi ini masih dibuka.');
    const staff = (s.employees || []).filter(x => String(x.business_id) === String(biz.id) && x.status === 'active').length, cap = 6 + 4 * (biz.v700?.branches || 0) + (biz.v655?.levels?.capacity || 0); if (staff >= cap) return err(`Kapasitas tim maksimal ${cap} orang. Tambah cabang atau upgrade kapasitas.`);
    biz.cash -= 400000; const vid = uid(), r = rngFor(`${user.id}:vac:${vid}`), n = 4 + Math.floor(r() * 3); v.hr.vac.unshift({ id: vid, businessId: biz.id, role, openDay: day, readyDay: day + 2, expireDay: day + 14 });
    for (let i = 0; i < n; i++) v.hr.cand.push({ ...genCandidate(r, cat, role, biz.reputation || 0), vacId: vid }); return done({ ok: true, readyDay: day + 2, applicants: n });
  }
  if (p === '/api/v700/hr/interview') {
    const c = v.hr.cand.find(x => x.id === b.candId), vac = c && v.hr.vac.find(x => x.id === c.vacId); if (!c || day < vac.readyDay) return err('Kandidat belum tersedia.', 404); const q = clean(b.q, 10), qd = QUESTIONS.find(x => x.id === q); if (!qd) return err('Pertanyaan tidak valid.');
    if (!c.asked.includes(q)) { if (c.asked.length >= 3) return err('Maksimal 3 pertanyaan per kandidat. Gunakan tes skill atau cek referensi untuk informasi lain.'); c.asked.push(q); }
    const rr = rngFor(`${user.id}:ans:${c.id}:${q}`), honest = c.honesty >= 45, stay = c.loyalty > 65 ? 'bersedia bertahan lebih dari 3 tahun' : c.loyalty > 40 ? 'berencana bertahan sekitar 1 sampai 2 tahun' : 'masih membuka peluang lain dan mungkin tidak lama';
    const ans = {
      exp: `${c.exp ? `Saya ${c.exp} tahun bekerja sebagai ${c.role}.` : 'Saya belum punya pengalaman formal.'} ${!honest && rr() < .6 ? ' Ketika ditanya detail, jawabannya berubah-ubah dan kurang konsisten.' : ' Detail pekerjaannya konsisten dan jelas.'}`,
      why: c.loyalty > 65 ? 'Saya ingin tumbuh dan membangun karier jangka panjang di sini.' : c.loyalty > 40 ? 'Saya mencari pengalaman dan penghasilan yang lebih baik.' : 'Saya sedang menunggu beberapa tawaran lain, tapi tertarik dengan posisi ini.',
      press: `Saya ${TRAITS[c.trait].txt}.`, weak: honest ? (c.flaw === 'none' ? 'Sejauh ini tidak ada kelemahan yang menonjol.' : `Saya akui: ${FLAWS.find(x => x.id === c.flaw).n.toLowerCase()}.`) : 'Saya tidak punya kelemahan berarti.',
      sal: `Saya mengharapkan sekitar ${fmt(c.expected)} per bulan dan ${stay}.`, case: `Skill praktis saya kira-kira ${['pemula', 'cukup', 'mahir', 'sangat mahir'][clamp(Math.floor((c.skill - 25) / 20), 0, 3)]} (perkiraan ${Math.round((c.skill + (rr() - .5) * 16) / 5) * 5}).`
    }[q];
    await save(user, s); return json({ ok: true, answer: ans, remaining: 3 - c.asked.length });
  }
  if (p === '/api/v700/hr/test') {
    const c = v.hr.cand.find(x => x.id === b.candId), biz = c && findBiz(s, v.hr.vac.find(x => x.id === c.vacId)?.businessId); if (!c || !biz) return err('Kandidat tidak ditemukan.', 404); const kind = b.kind === 'ref' ? 'ref' : 'skill', cost = kind === 'ref' ? 100000 : 150000;
    if (c.tests[kind]) return err('Tes ini sudah dilakukan.'); if (biz.cash < cost) return err('Kas bisnis tidak cukup.'); biz.cash -= cost; c.tests[kind] = true;
    const rr = rngFor(`${user.id}:tst:${c.id}:${kind}`), res = kind === 'skill' ? { skill: clamp(Math.round(c.skill + (rr() - .5) * 6), 0, 100) } : { honesty: c.honesty >= 65 ? 'Baik' : c.honesty >= 45 ? 'Cukup' : 'Buruk', loyalty: c.loyalty >= 65 ? 'Tinggi' : c.loyalty >= 40 ? 'Sedang' : 'Rendah', flaw: FLAWS.find(x => x.id === c.flaw).n };
    c['res_' + kind] = res; return done({ ok: true, result: res });
  }
  if (p === '/api/v700/hr/hire') {
    const c = v.hr.cand.find(x => x.id === b.candId), vac = c && v.hr.vac.find(x => x.id === c.vacId), biz = vac && findBiz(s, vac.businessId); if (!c || !biz) return err('Kandidat tidak ditemukan.', 404); const offer = Math.round(num(b.salary) / 50000) * 50000; if (offer < 1000000) return err('Gaji minimal Rp1.000.000.');
    const staff = (s.employees || []).filter(x => String(x.business_id) === String(biz.id) && x.status === 'active').length, cap = 6 + 4 * (biz.v700?.branches || 0) + (biz.v655?.levels?.capacity || 0); if (staff >= cap) return err(`Kapasitas tim maksimal ${cap} orang.`);
    const rr = rngFor(`${user.id}:hire:${c.id}:${c.attempts}`), prob = clamp(.35 + (offer / c.expected - 1) * 1.8 + (c.rep || 0) / 300, .05, .97); c.attempts++;
    if (rr() > prob) { if (c.attempts >= 2) { v.hr.cand = v.hr.cand.filter(x => x !== c); await save(user, s); return json({ ok: false, left: true, message: `${c.name} menolak dan memilih tawaran lain.` }); } await save(user, s); return json({ ok: false, counter: Math.round(c.expected * .97 / 50000) * 50000, message: `${c.name} menolak tawaran. Ia masih mau jika gajinya mendekati ${fmt(Math.round(c.expected * .97 / 50000) * 50000)}.` }); }
    const tr = TRAITS[c.trait], fl = FLAWS.find(x => x.id === c.flaw), e = { id: uid(), user_id: user.id, business_id: biz.id, name: c.name, role: c.role, salary: offer, skill: Math.round(c.skill), morale: Math.round(clamp(60 + (offer / c.expected - 1) * 40, 40, 90)), productivity: Math.round(clamp(30 + c.skill * .6 + tr.prod + fl.prod, 20, 100)), status: 'active', created_at: new Date().toISOString(),
      v700: { trait: c.trait, trait2: c.trait2, flaw: c.flaw, age: c.age, edu: c.edu, exp: c.exp, loyalty: clamp(c.loyalty + (offer / c.expected - 1) * 30, 5, 100), honesty: c.honesty, expected: c.expected, desc: c.desc, hiredDay: day } };
    s.employees.unshift(e); v.hr.cand = v.hr.cand.filter(x => x !== c); news(v, day, 'hr', `${e.name} bergabung sebagai ${e.role}`, `Karyawan baru di ${biz.name} dengan gaji ${fmt(offer)}.`, 'up'); achievement(s, 'first_hire', 'First Hire'); return done({ ok: true, employee: e });
  }
  if (p === '/api/v700/hr/fire') {
    const e = s.employees.find(x => x.id === b.id && x.status === 'active'), biz = e && findBiz(s, e.business_id); if (!e) return err('Karyawan tidak ditemukan.', 404); const sev = e.salary; if (biz.cash < sev) return err(`Kas bisnis tidak cukup untuk pesangon ${fmt(sev)}.`);
    biz.cash -= sev; e.status = 'fired'; for (const x of s.employees.filter(q => String(q.business_id) === String(biz.id) && q.status === 'active')) x.morale = Math.max(0, x.morale - 3); return done({ ok: true, severance: sev });
  }
  if (p === '/api/v700/hr/raise') {
    const e = s.employees.find(x => x.id === b.id && x.status === 'active'); if (!e) return err('Karyawan tidak ditemukan.', 404); const pct = clamp(num(b.pct), 3, 30); e.salary = Math.round(e.salary * (1 + pct / 100) / 50000) * 50000; e.morale = Math.min(100, e.morale + pct * .5); if (e.v700) { e.v700.loyalty = Math.min(100, e.v700.loyalty + pct * .8); e.v700.askRaise = false; } return done({ ok: true, salary: e.salary });
  }

  /* ================= INTERVIEW KARIER ================= */
  if (p === '/api/v700/job/interview/start') {
    const j = h.jobs.find(x => x.id === b.jobId); if (!j) return err('Pekerjaan tidak ditemukan.', 404); const rr = rngFor(`${user.id}:iv:${j.id}:${day}`), pool = [...INTERVIEW].sort(() => rr() - .5).slice(0, 3);
    v.iv = { jobId: j.id, qs: pool.map(q => q.id), day }; return done({ ok: true, job: j, questions: pool.map(q => ({ id: q.id, q: q.q, o: q.o.map(x => x[0]) })) });
  }
  if (p === '/api/v700/job/interview/submit') {
    const j = h.jobs.find(x => x.id === b.jobId); if (!j || !v.iv || v.iv.jobId !== j.id || v.iv.day !== day) return err('Mulai interview terlebih dahulu.'); const ans = Array.isArray(b.answers) ? b.answers : [];
    let pts = 0; v.iv.qs.forEach((id, i) => { const q = INTERVIEW.find(x => x.id === id), o = q.o[Number(ans[i])]; pts += o ? o[1] : 0; });
    const rank = { SD: 0, SMP: 0, 'SMA/SMK': 1, D3: 2, S1: 3 }, need = j.education.includes('S1') && !j.education.includes('D3') ? 3 : j.education.includes('D3') ? 2 : 1, have = rank[s.career?.educationLevel] ?? 1, eduPen = have < need ? -12 : 0;
    const parts = { skill: Math.round(h.skillAverage(s) * .55), exp: Math.min(8, Math.round((s.career?.experience || 0) * .8)), answers: pts, bonus: v.bonus.interview || 0, edu: eduPen }; const score = clamp(Object.values(parts).reduce((a, c) => a + c, 0), 0, 100), pass = score >= j.min_skill;
    const neg = [0, 5, 10, 15].includes(Number(b.negotiate)) ? Number(b.negotiate) : 0, salary = pass && neg && score - j.min_skill >= neg * 1.2 ? Math.round(j.salary * (1 + neg / 100) / 50000) * 50000 : j.salary; v.iv = null;
    s.applications.unshift({ id: uid(), job_id: j.id, title: j.title, company: j.company, salary, score, status: pass ? 'accepted' : 'rejected', created_at: new Date().toISOString() });
    if (pass) { s.career = { ...s.career, status: 'employed', salary, position: j.title, company: j.company, experience: s.career.experience || 0, history: [{ company: j.company, position: j.title, salary, startedDay: day }, ...(s.career.history || [])] }; achievement(s, 'first_job', 'First Job'); addNotice(s, 'Lamaran diterima', `${j.title} di ${j.company} dengan gaji ${fmt(salary)}.`, 'success'); news(v, day, 'career', `Diterima sebagai ${j.title}`, `${j.company} menawarkan gaji ${fmt(salary)} per bulan.`, 'up'); }
    else addNotice(s, 'Interview belum berhasil', `Skor ${score}, dibutuhkan ${j.min_skill}. Tingkatkan skill atau beli perlengkapan di Shop.`, 'warning');
    return done({ ok: true, pass, score, salary, parts, need: j.min_skill, negotiated: salary > j.salary });
  }

  /* ================= CREATOR ================= */
  if (p === '/api/v700/creator/post') {
    const k = clean(b.platform, 20), def = PLATFORMS[k], pl = v6.platforms[k], types = CONTENT[k]; if (!def || !pl) return err('Platform belum dibuat.', 404); if (pl.lastPostDay === day) return err('Konten hari ini sudah diunggah. Lanjutkan ke hari berikutnya.');
    const ty = types[Math.floor(num(b.type))] || types[0], md = ty[1]; if (s.cash < md.cost) return err('Cash personal tidak cukup untuk biaya produksi.'); const cr = v.creator, sk = cr.streak[k] || { n: 0, last: 0 }; sk.n = sk.last === day - 1 ? sk.n + 1 : 1; sk.last = day; cr.streak[k] = sk;
    const r = rngFor(`${user.id}:post7:${k}:${day}:${pl.posts}`), q = platformQuality(s, pl) * md.q, streak = 1 + Math.min(.2, sk.n * .02), viral = r() < def.viral * md.viral * (1 + pl.trend / 200);
    const views = Math.max(30, Math.round((pl.followers * .18 + 80 + q * 12) * (viral ? 4 + r() * 4 : .6 + r() * .8) * md.reach * streak)), gain = Math.max(1, Math.round(views * (viral ? .02 : .01) * (1 + q / 200) * (md.loyal || 1)));
    s.cash -= md.cost; pl.views += views; pl.followers += gain; pl.posts++; pl.lastPostDay = day; if (viral) pl.trend = Math.min(100, pl.trend + 40); if (!pl.monetized && pl.followers >= def.need && pl.posts >= 20) pl.monetized = true;
    cr.last[k] = pl.views; const hist = cr.hist[k] || (cr.hist[k] = []), td = hist.find(x => x.d === day); if (td) { td.v += views; td.f = Math.round(pl.followers); } else hist.push({ d: day, v: views, f: Math.round(pl.followers) });
    let deal = null; const di = cr.deals.findIndex(x => x.platform === k); if (di >= 0 && pl.followers >= cr.deals[di].need) { deal = cr.deals.splice(di, 1)[0]; const pay = Math.round(deal.payout * (md.sponsor || 1)); s.cash += pay; deal.paid = pay; news(v, day, 'creator', `Kerja sama ${deal.brand} selesai`, `Pembayaran ${fmt(pay)} diterima dari unggahan ${ty[0]}.`, 'up'); }
    return done({ ok: true, viral, views, followers: gain, monetized: pl.monetized, streak: sk.n, type: ty[0], deal });
  }
  if (p === '/api/v700/creator/offer') {
    const cr = v.creator, o = cr.offers.find(x => x.id === b.id); if (!o) return err('Tawaran tidak ditemukan atau sudah kedaluwarsa.', 404); cr.offers = cr.offers.filter(x => x !== o);
    if (b.accept) { cr.deals.push({ ...o, deadline: day + 7 }); return done({ ok: true, deadline: day + 7 }); } return done({ ok: true });
  }

  /* ================= CABANG BISNIS (upgrade berulang) ================= */
  if (p === '/api/v700/branch/open') {
    const biz = findBiz(s, b.businessId), cat = biz && h.businessCatalog.find(x => x.id === biz.catalogId); if (!biz || !cat) return err('Business tidak ditemukan.', 404); const n = biz.v700?.branches || 0; if (n >= 8) return err('Maksimal 8 cabang.');
    const cost = Math.round(cat.startup * .7 * Math.pow(1.5, n) / 10000) * 10000; if (biz.cash < cost) return err(`Kas bisnis kurang. Butuh ${fmt(cost)}.`);
    biz.cash -= cost; biz.v700 = { ...(biz.v700 || {}), branches: n + 1 }; const ops = biz.operations || (biz.operations = {}); ops.capacity = R((ops.capacity || 50) * 1.25); ops.monthlyFixed = R((ops.monthlyFixed || 0) * 1.18); for (const x of s.products.filter(q => String(q.business_id) === String(biz.id))) x.capacity = R(x.capacity * 1.25);
    biz.value += Math.round(cost * .6); biz.reputation = Math.min(100, (biz.reputation || 0) + 1); news(v, day, 'business', `${biz.name} membuka cabang ke-${n + 1}`, `Kapasitas naik 25% dan tim bisa bertambah. Biaya ${fmt(cost)}.`, 'up', { biz: biz.id }); return done({ ok: true, branches: n + 1, cost });
  }
  if (p === '/api/v700/news/read') { v.newsRead = day; return done({ ok: true }); }
  return err('API_NOT_FOUND', 404);
}
