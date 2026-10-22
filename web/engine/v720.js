/* GENERATED dari netlify/functions/v720.mjs. Jangan diedit di sini. Jalankan: npm run sync:local */
// BizSim 7.2.0 additive layer. State: s.v720. Day logic runs through DAY_HOOKS in the v700 engine. SIMULATION ONLY.
import { rngFor, gauss, clamp, R, PLATFORMS, creatorLevel } from './v655.js';
import { DAY_HOOKS, ensure as ensure700, news, fmt, pick, meta, roundPx, last, propValue, bonusOf } from './v700-engine.js';
import { SHOP, PROPERTY } from './v700-data.js';
import { VERSION, COURSES, LK, EVT, BROKER_BASE, BROKERS0, BROKER_NAMES, MYBROKER, BRANCH_CITIES, STUDIO } from './v720-data.js';
export { VERSION };
const rid = (r, p = 'x') => p + Math.floor(r() * 1e10).toString(36);
const riskLabel = (vol, legal, flood) => { const s = vol * 4 + legal * 5 + flood * 2; return s < .62 ? 'Low' : s < .85 ? 'Medium' : 'High'; };

/* ---------- land ---------- */
function mkLand(r, d, i, navLand) {
  const kind = pick(r, Object.keys(LK)), k = LK[kind], city = pick(r, k.cities), sqm = pick(r, k.sqm), ppsm = Math.round(k.ppsm * (navLand / 1e6) * (.8 + r() * .5) / 1e4) * 1e4;
  const mu = k.mu + (r() - .5) * .04, vol = k.vol * (.8 + r() * .5), legal = k.legal * (.4 + r() * 1.6), flood = k.flood * (.4 + r() * 1.6), infra = Math.round(20 + r() * 70);
  return { id: `${Math.floor(d / 7)}-${i}`, kind, city, name: `${k.label} ${city}`, sqm, ppsm, price: sqm * ppsm, risk: riskLabel(vol, legal, flood), est5: Math.round(sqm * ppsm * Math.exp(k.mu * 5) * (.88 + r() * .24) / 1e6) * 1e6, day: d, an: null, hid: { mu, vol, legal, flood, infra } };
}
function refreshLand(s, x, d, userId) {
  const L = x.land, r = rngFor(`${userId}:land:${Math.floor(d / 7)}`); L.listings = L.listings.filter(l => d - l.day <= 21).slice(0, 6);
  for (let i = 0; i < 6; i++) L.listings.push(mkLand(r, d, i, s.v655.nav.land));
}
const landValue = p => p.sqm * p.ppsm * p.idx;

/* ---------- events ---------- */
const MEAN = {}; { const tot = EVT.reduce((a, e) => a + e.w, 0); for (const e of EVT) for (const o of e.outs) for (const [tg, pc] of o.imp) MEAN[tg] = (MEAN[tg] || 0) + .16 * e.w / tot * o.p * pc; }
function compensate(s, v, x) {
  const v6 = s.v655;
  for (const t of Object.keys(v.stocks)) { const st = v.stocks[t], m = meta(v, t); if (st.status !== 'listed' || !m) continue; const c = (m.beta || 1) * (MEAN.all || 0) + (MEAN['sec:' + m.sec] || 0) + (MEAN['tk:' + t] || 0); st.price = roundPx(m, st.price * (1 - c)); }
  for (const [tg, key] of [['gold', 'gold'], ['land', 'land'], ['prop', 'property'], ['bond', 'bond']]) if (MEAN[tg]) v6.nav[key] = Math.max(1, v6.nav[key] * (1 - MEAN[tg]));
  if (MEAN.art) v.art.idx *= 1 - MEAN.art;
  for (const id of ['BTC', 'ETH', 'SOL', 'OIL']) { const m = id === 'OIL' ? MEAN.oil : MEAN.crypto * (id === 'ETH' ? 1.2 : id === 'SOL' ? 1.5 : 1); if (m) { const c = last(v.trading.c[id]); c[3] = Math.round(c[3] * (1 - m) * 100) / 100; c[1] = Math.max(c[1], c[3]); c[2] = Math.min(c[2], c[3]); } }
}
function applyImp(s, v, x, imp) {
  const v6 = s.v655, chips = [], add = (asset, pc) => chips.push({ asset, pct: R(pc * 1000) / 10 });
  for (const [tg, pc] of imp) {
    if (tg === 'all' || tg.startsWith('sec:') || tg.startsWith('tk:')) {
      for (const t of Object.keys(v.stocks)) {
        const st = v.stocks[t], m = meta(v, t); if (st.status !== 'listed' || !m) continue;
        if (!(tg === 'all' || (tg.startsWith('tk:') && t === tg.slice(3)) || (tg.startsWith('sec:') && m.sec === tg.slice(4)))) continue;
        const f = tg === 'all' ? (m.beta || 1) : 1; st.price = roundPx(m, st.price * (1 + pc * .5 * f)); st.imp.push({ per: pc * .5 * f / 4, left: 4 });
      }
      add(tg === 'all' ? 'IGB' : tg.slice(tg.indexOf(':') + 1), pc);
    } else if (['gold', 'land', 'prop', 'bond'].includes(tg)) {
      const key = { gold: 'gold', land: 'land', prop: 'property', bond: 'bond' }[tg]; v6.nav[key] = Math.max(1, v6.nav[key] * (1 + .6 * pc)); v6.pending.push({ asset: key, per: .4 * pc / 6, left: 6 });
      add({ gold: 'Emas', land: 'Tanah', prop: 'Properti', bond: 'Obligasi' }[tg], pc);
    } else if (tg === 'crypto' || tg === 'oil') {
      for (const id of tg === 'crypto' ? ['BTC', 'ETH', 'SOL'] : ['OIL']) { const c = last(v.trading.c[id]), f = 1 + pc * (id === 'ETH' ? 1.2 : id === 'SOL' ? 1.5 : 1); c[3] = Math.round(c[3] * f * 100) / 100; c[1] = Math.max(c[1], c[3]); c[2] = Math.min(c[2], c[3]); }
      add(tg === 'crypto' ? 'Kripto' : 'Minyak', pc);
    } else if (tg === 'usd') { v6.macro.usdidr *= 1 + pc; add('USD/IDR', pc); }
    else if (tg === 'art') { v.art.idx *= 1 + pc; add('Seni', pc); }
    else if (tg === 'rate') v6.macro.rate = clamp(v6.macro.rate + pc, 3, 12);
  }
  return chips;
}
function eventsDay(s, v, x, d, r, h) {
  compensate(s, v, x);
  if (r() > .16) return; const tot = EVT.reduce((a, e) => a + e.w, 0); let q = r() * tot, ev = EVT[0]; for (const e of EVT) { q -= e.w; if (q <= 0) { ev = e; break; } }
  let q2 = r(), out = ev.outs[ev.outs.length - 1]; for (const o of ev.outs) { q2 -= o.p; if (q2 <= 0) { out = o; break; } }
  const who = pick(r, ev.who), chips = applyImp(s, v, x, out.imp), big = chips.some(c => Math.abs(c.pct) >= 5), title = out.t(who);
  news(v, d, ev.kind, title, out.b, out.tone, { impact: chips, breaking: big, who });
  if (big) h.addNotice(s, title, out.b, out.tone === 'up' ? 'success' : 'warning');
}

/* ---------- land daily ---------- */
function landDay(s, v, x, d, r, h) {
  const L = x.land, v6 = s.v655, nav = v6.nav.land, nr = L.lastNav ? nav / L.lastNav - 1 : 0; L.lastNav = nav;
  for (const p of L.owned) {
    const k = LK[p.kind], hd = p.hid || { mu: k.mu, vol: k.vol, legal: k.legal, flood: k.flood, infra: 50 };
    p.idx = clamp(p.idx * Math.exp(hd.mu / 365 + hd.vol / Math.sqrt(365) * gauss(r) + nr * .6 - (v6.macro.rate - 6.25) * .008 / 365 - .5 * hd.vol * hd.vol / 365), .2, 6);
    if (!p.dispute && r() < hd.legal / 365) { p.dispute = true; p.idx *= .8; news(v, d, 'land', `Sengketa lahan di ${p.name}`, 'Pihak lain mengklaim kepemilikan. Nilai turun dan lahan tidak bisa dijual sampai sengketa diselesaikan.', 'down'); h.addNotice(s, 'Sengketa lahan', `${p.name} tidak bisa dijual sebelum sengketa selesai.`, 'danger'); }
    if (r() < hd.flood / 365 * .25) { p.idx *= .92; news(v, d, 'flood', `Banjir merendam ${p.name}`, 'Genangan menurunkan minat pembeli. Nilai lahan turun sekitar 8%.', 'down'); }
    if (r() < hd.infra / 100 * .0012) { const j = .08 + r() * .15; p.idx *= 1 + j; news(v, d, 'land', `Akses jalan baru mendekati ${p.name}`, `Harga lahan naik sekitar ${Math.round(j * 100)}% setelah pengumuman proyek.`, 'up'); }
    if (r() < .0004) { p.idx *= .9; news(v, d, 'land', `Perubahan tata ruang di ${p.city}`, 'Peruntukan lahan dibatasi sehingga harga turun 10%.', 'down'); }
    if (p.leased && (d - p.boughtDay) % 30 === 0 && d > p.boughtDay) { const inc = R(landValue(p) * k.lease / 12 * (.7 + r() * .6) * .9); s.cash += inc; p.income = (p.income || 0) + inc; }
  }
  if (!L.listings.length || d % 7 === 1) refreshLand(s, x, d, h.userId);
}

/* ---------- auctions ---------- */
function spawnAuction(s, v, x, d, r) {
  const kind = pick(r, ['land', 'property', 'art', 'car']), v6 = s.v655; let a;
  if (kind === 'land') { const l = mkLand(r, d, 0, v6.nav.land); a = { kind, title: `Lelang ${l.name}`, desc: `${l.sqm.toLocaleString('id-ID')} m2 di ${l.city}. Aset sitaan pemerintah daerah.`, ill: l.kind, fair: Math.round(l.price * (.92 + r() * .45) / 1e6) * 1e6, payload: l }; }
  else if (kind === 'property') { const t = pick(r, PROPERTY.filter(p => p.k !== 'tanah')), city = pick(r, t.city); a = { kind, title: `Lelang ${t.n} ${city}`, desc: `${t.sz} di ${city}. Aset sitaan bank.`, ill: t.k, fair: Math.round(t.base * (.85 + r() * .6) * (v6.nav[t.src] || 1e6) / 1e6 / 1e6) * 1e6, payload: { k: t.k, n: t.n, city, sz: t.sz, src: t.src } }; }
  else if (kind === 'art') { const it = pick(r, SHOP.filter(q => q.col)); a = { kind, title: `Lelang ${it.n}`, desc: 'Koleksi kolektor pribadi dengan sertifikat keaslian.', ill: 'art', fair: Math.round(it.p * (.8 + r() * 1.8) / 1e5) * 1e5, payload: { itemId: it.id, name: it.n } }; }
  else { const it = SHOP.find(q => q.id === 'classic-car'); a = { kind, title: 'Lelang Mobil Klasik', desc: 'Mobil koleksi tahun 1960-an dengan dokumen lengkap.', ill: 'car', fair: Math.round(it.p * (.7 + r() * 1.2) / 1e6) * 1e6, payload: { itemId: it.id, name: it.n } }; }
  const start = Math.round(a.fair * (.55 + r() * .25) / 1e5) * 1e5;
  Object.assign(a, { id: rid(r, 'a'), start, current: 0, bidder: null, minInc: Math.max(500000, Math.round(start * .03 / 1e5) * 1e5), startDay: d, endDay: d + 4 + Math.floor(r() * 5), reserve: Math.round(a.fair * (.85 + r() * .5)), maxAuto: 0, deposit: 0, hist: [], done: false, estLo: Math.round(a.fair * (.85 + r() * .1) / 1e6) * 1e6, estHi: Math.round(a.fair * (1.1 + r() * .12) / 1e6) * 1e6 });
  x.auctions.push(a); news(v, d, 'auction', `Lelang dibuka: ${a.title}`, `Penawaran awal ${fmt(a.start)}. Lelang berakhir hari ${a.endDay}.`, 'mixed');
}
function deliver(s, v, x, a, d) {
  const pay = a.payload, paid = a.current;
  if (a.kind === 'land') x.land.owned.unshift({ id: a.id, kind: pay.kind, city: pay.city, name: pay.name, sqm: pay.sqm, ppsm: Math.round(a.fair / pay.sqm), paid, idx: 1, boughtDay: d, leased: false, dispute: false, hid: pay.hid, income: 0, an: null });
  else if (a.kind === 'property') v.property.owned.unshift({ id: a.id, k: pay.k, n: `${pay.n} ${pay.city}`, city: pay.city, sz: pay.sz, price: a.fair, src: pay.src, entryIdx: s.v655.nav[pay.src], boughtDay: d, level: 0, income: 0 });
  else v.inv.unshift({ id: a.id, itemId: pay.itemId, cat: 'Koleksi', name: pay.name, price: paid, boughtDay: d, value: a.fair, k: a.fair / paid, idx0: v.art.idx, fake: false, appraised: true });
}
function auctionDay(s, v, x, d, r, h) {
  for (const a of x.auctions) {
    if (a.done) continue;
    if (d >= a.endDay) {
      a.done = true;
      if (a.bidder === 'you') { deliver(s, v, x, a, d); a.result = 'won'; news(v, d, 'auction', `Anda memenangkan ${a.title}`, `Harga akhir ${fmt(a.current)} (nilai wajar sekitar ${fmt(a.fair)}).`, a.current <= a.fair ? 'up' : 'mixed'); h.addNotice(s, 'Lelang dimenangkan', `${a.title} sekarang milik Anda.`, 'success'); }
      else { a.result = a.bidder ? 'lost' : 'nobid'; if (a.bidder) news(v, d, 'auction', `${a.title} terjual`, `Terjual ${fmt(a.current)} kepada penawar lain.`, 'mixed'); }
      continue;
    }
    if (r() < .55) {
      const nb = a.current ? a.current + a.minInc * (1 + Math.floor(r() * 3)) : a.start;
      if (nb <= a.reserve) {
        const prev = a.bidder; if (prev === 'you') { s.cash += a.deposit; a.deposit = 0; }
        a.current = nb; a.bidder = 'npc'; a.hist.push({ d, amt: nb, who: 'npc' });
        if (prev === 'you') {
          const nb2 = Math.min(a.maxAuto, a.current + a.minInc * (1 + Math.floor(r() * 2))), need = Math.round(nb2 * 1.05);
          if (a.maxAuto >= a.current + a.minInc && s.cash >= need) { s.cash -= need; a.deposit = need; a.current = nb2; a.bidder = 'you'; a.hist.push({ d, amt: nb2, who: 'you', auto: true }); }
          else { a.maxAuto = 0; h.addNotice(s, 'Penawaran terlampaui', `${a.title} dinaikkan menjadi ${fmt(a.current)}.`, 'warning'); }
        }
      }
    }
  }
  x.auctions = x.auctions.filter(a => !a.done || d - a.endDay < 12);
  const open = x.auctions.filter(a => !a.done).length; if (open < 3 && r() < (open === 0 ? .45 : .18)) spawnAuction(s, v, x, d, r);
}

/* ---------- courses ---------- */
const lockOf = (s, x, c) => { const l = c.lock; if (!l) return null; if (l.skill && (s.skills[l.skill] || 0) < l.min) return `Butuh skill ${l.skill} ${l.min}`; if (l.creator && creatorLevel(s) < l.creator) return `Butuh Creator Level ${l.creator}`; if (l.course && !(x.courses[l.course]?.cert)) return `Selesaikan ${COURSES.find(q => q.id === l.course).name} dahulu`; return null; };
function lessonsDay(s, v, x, d, h) {
  x.lessons = x.lessons.filter(l => {
    if (d < l.endDay) return true; const c = COURSES.find(q => q.id === l.course); if (!c) return false; const bonus = 1 + (v.bonus?.learn || 0);
    for (const [k, g] of Object.entries(l.gains)) s.skills[k] = Math.min(100, Number(s.skills[k] || 20) + Math.round(g * bonus));
    const st = (x.courses[l.course] ||= { done: 0 }); st.done = Math.max(st.done, l.idx + 1);
    h.addNotice(s, 'Pelajaran selesai', `${c.name}: ${l.name}.`, 'success');
    if (st.done >= c.lessons.length) {
      st.cert = true; if (c.cert) { s.career.certifications = s.career.certifications || []; if (!s.career.certifications.includes(c.cert)) s.career.certifications.push(c.cert); }
      if (c.level) s.career.educationLevel = c.level; news(v, d, 'career', `Lulus: ${c.name}`, c.cert ? `Sertifikat ${c.cert} diterima.` : `Gelar ${c.level} diraih.`, 'up'); h.achievement(s, 'graduate', 'Graduate');
    }
    return false;
  });
}

/* ---------- brokers ---------- */
function brokerDay(s, v, x, d, r, h) {
  if (r() < 1 / 140 && x.brokers.filter(b => b.status === 'open').length < 8) { const nm = `${pick(r, BROKER_NAMES)} Sekuritas`; if (!x.brokers.some(b => b.name === nm)) { const b = { id: rid(r, 'b'), name: nm, buy: Math.round((.0007 + r() * .0009) * 1e5) / 1e5, sell: Math.round((.0017 + r() * .0017) * 1e5) / 1e5, min: r() < .5 ? 0 : [5e6, 10e6, 25e6][Math.floor(r() * 3)], perk: 'Broker baru dengan promo biaya perdana.', status: 'open', day: d }; x.brokers.push(b); news(v, d, 'broker', `${nm} resmi beroperasi`, `Biaya beli ${(b.buy * 100).toFixed(2)}% dan jual ${(b.sell * 100).toFixed(2)}%.`, 'up'); } }
  if (r() < 1 / 1100) { const open = x.brokers.filter(b => b.status === 'open'); if (open.length > 1) { const b = pick(r, open); b.status = 'collapsed'; news(v, d, 'broker', `${b.name} dicabut izinnya`, 'Regulator menghentikan operasi akibat pelanggaran. Nasabah dipindahkan ke broker dasar.', 'down'); if (x.broker === b.id) { x.broker = 'default'; v.brokerFee = { buy: BROKER_BASE.buy, sell: BROKER_BASE.sell }; h.addNotice(s, 'Broker Anda ditutup', 'Akun dialihkan ke Bursa Dasar.', 'warning'); } } }
  const m = x.myBroker; if (!m) return;
  const idxH = v.idxHist || [], bull = idxH.length > 1 && idxH[idxH.length - 1] / idxH[idxH.length - 2] - 1 > .012, fee = (m.buy + m.sell) / 2, A = clamp((m.rep / 100 + m.tech * .08 + m.research * .06) * Math.pow(.0025 / fee, .8) * (m.promoUntil > d ? 1.5 : 1), .05, 4);
  m.clients = Math.max(0, Math.min(50 + m.rep * 60, m.clients + Math.floor(A * 8 + r()) - Math.round(m.clients * .0025)));
  const turn = m.clients * 600000 * (bull ? 1.5 : 1) * (.8 + r() * .4), rev = Math.round(turn * fee), cost = Math.round(150000 + m.clients * 250 + m.tech * 40000 + m.research * 30000);
  m.cash += rev - cost; m.rev30 = [...(m.rev30 || []), rev - cost].slice(-30); m.rep = clamp(m.rep + .05, 0, 100);
  if (r() < .003 * (1 - m.tech * .15)) { m.rep = Math.max(0, m.rep - 4); news(v, d, 'broker', `Gangguan sistem di ${m.name}`, 'Aplikasi sempat tidak bisa dipakai. Reputasi turun 4 poin.', 'down'); }
  if (r() < .002) { const l = R(5e6 + r() * 15e6); m.cash -= l; news(v, d, 'broker', `Nasabah gagal bayar di ${m.name}`, `Kerugian ${fmt(l)} ditanggung perusahaan.`, 'down'); }
  if (r() < .001) { m.cash -= 25e6; news(v, d, 'broker', `${m.name} dikenai denda regulator`, 'Denda administrasi Rp25 juta atas pelaporan terlambat.', 'down'); }
  m.total = (m.total || 0) + rev;
}

/* ---------- bookkeeping ---------- */
function netWorth(s, v, x) {
  const v6 = s.v655; let inv = 0;
  inv += Object.entries(v.holdings).reduce((a, [t, hd]) => a + hd.shares * (v.stocks[t]?.price || 0), 0);
  inv += v.trading.pos.reduce((a, p) => a + Math.max(0, p.margin + p.dir * (last(v.trading.c[p.asset])[3] / p.entry - 1) * p.margin * p.lev - p.fees), 0);
  inv += v.bonds.filter(b => b.status === 'active').reduce((a, b) => a + b.amount, 0) + Object.entries(v.funds.units).reduce((a, [k, u]) => a + u.units * v.funds.nav[k], 0) + v.gold.grams * v6.nav.gold;
  inv += v.property.owned.reduce((a, p) => a + propValue(v6, p), 0) + v.deposits.filter(q => q.status === 'active').reduce((a, q) => a + q.amount, 0);
  inv += v.inv.reduce((a, i) => a + (SHOP.find(q => q.id === i.itemId)?.col ? (i.value || i.price) : 0), 0) + x.land.owned.reduce((a, p) => a + landValue(p), 0) + (s.investments || []).reduce((a, q) => a + (q.currentValue || 0), 0);
  return { cash: Math.round(s.cash), inv: Math.round(inv), biz: Math.round((s.businesses || []).reduce((a, b) => a + (b.value || 0) + (b.cash || 0), 0)) };
}
function incidentDetail(s, x) {
  for (const inc of s.incidents || []) {
    if (inc.v720 || inc.data?.trigger !== 'v700') continue; const rr = rngFor(`inc:${inc.id}`), w = { fire: [.7, .45, .2], flood: [.55, .3, .5], theft: [.5, 0, .1] }[inc.type] || [.4, .3, .2], biz = (s.businesses || []).find(b => String(b.id) === String(inc.business_id));
    inc.v720 = { inv: Math.round(Math.min(.95, w[0] * (.6 + rr() * .7)) * 100), str: Math.round(Math.min(.95, w[1] * (.6 + rr() * .7)) * 100), eq: Math.round(Math.min(.95, w[2] * (.6 + rr() * .9)) * 100), city: biz?.location || '', claimed: false };
  }
}
function creatorDay(s, v, x, d) {
  for (const [k, pl] of Object.entries(s.v655.platforms || {})) {
    const prev = x.crPrev[k] ?? pl.income; x.crPrev[k] = pl.income; (x.crInc[k] ||= []).push(Math.max(0, pl.income - prev)); x.crInc[k] = x.crInc[k].slice(-30); (x.crF[k] ||= []).push(Math.round(pl.followers)); x.crF[k] = x.crF[k].slice(-31);
  }
}
function dayHook(s, v, d, userId, h) {
  const x = ensure720(s, userId), r = rngFor(`${userId}:720:${d}`), hh = { ...h, userId };
  eventsDay(s, v, x, d, r, hh); landDay(s, v, x, d, r, hh); auctionDay(s, v, x, d, r, hh); lessonsDay(s, v, x, d, hh); brokerDay(s, v, x, d, r, hh); creatorDay(s, v, x, d); incidentDetail(s, x);
  x.nw.push({ d, ...netWorth(s, v, x) }); x.nw = x.nw.slice(-90);
}
DAY_HOOKS.push(dayHook);

export function ensure720(s, userId = 0) {
  const v = ensure700(s, userId);
  if (!s.v720) {
    const x = s.v720 = { version: VERSION, land: { listings: [], owned: [], lastNav: null }, auctions: [], courses: {}, lessons: [], brokers: BROKERS0.map(b => ({ ...b, status: 'open', day: 0 })), broker: 'default', myBroker: null, short: [], crInc: {}, crF: {}, crPrev: {}, nw: [], studio: 0 };
    refreshLand(s, x, s.day || 1, userId); const r = rngFor(`${userId}:auc0`); spawnAuction(s, v, x, s.day || 1, r); spawnAuction(s, v, x, s.day || 1, r);
  }
  const x = s.v720; x.version = VERSION; x.land ||= { listings: [], owned: [], lastNav: null }; x.auctions ||= []; x.courses ||= {}; x.lessons ||= []; x.brokers ||= []; x.short ||= []; x.crInc ||= {}; x.crF ||= {}; x.crPrev ||= {}; x.nw ||= []; v.studioLv = x.studio || 0;
  return x;
}
export function catchup720(s, userId) { const had = !!s.v720, x = ensure720(s, userId); incidentDetail(s, x); if (!x.nw.length) x.nw.push({ d: s.day, ...netWorth(s, s.v700, x) }); return !had; }
export const hide720 = s => {
  if (!s.v720) return s; const x = s.v720, an = a => (a.an ? a.an : null);
  const strip = ({ hid, ...l }) => l, ownStrip = ({ hid, ...p }) => p;
  return { ...s, v720: { ...x, land: { ...x.land, listings: x.land.listings.map(strip), owned: x.land.owned.map(ownStrip) }, auctions: x.auctions.map(({ fair, reserve, payload, ...a }) => a) } };
};

/* ---------- API ---------- */
export function catalog() { return { version: VERSION, courses: COURSES.map(c => ({ ...c, lessons: c.lessons.map(l => ({ ...l })) })), landKinds: Object.fromEntries(Object.entries(LK).map(([k, q]) => [k, { label: q.label, lease: q.lease, cities: q.cities }])), brokerBase: BROKER_BASE, myBroker: { cost: MYBROKER.cost, minFee: MYBROKER.minFee, maxFee: MYBROKER.maxFee, max: MYBROKER.max, costs: [0, 1, 2, 3, 4].map(MYBROKER.upCost) }, studio: STUDIO, platformLvl: Object.fromEntries(Object.entries(PLATFORMS).map(([k, p]) => [k, p.lvl || 1])), branchCities: BRANCH_CITIES }; }
export async function route({ p, m, s, user, req, h }) {
  if (!p.startsWith('/api/v720/')) return null;
  const { json, body, clean, uid, save, achievement, findBiz } = h, x = ensure720(s, user.id), v = s.v700, v6 = s.v655, day = s.day, num = q => Number(q) || 0, b = m === 'POST' ? await body(req) : {};
  const err = (msg, c = 400) => json({ error: msg }, c), done = async d => { await save(user, s); return json(d); };
  if (m === 'GET' && p === '/api/v720/catalog') return json(catalog()); if (m !== 'POST') return err('API_NOT_FOUND', 404);

  /* land */
  if (p === '/api/v720/land/buy') {
    const l = x.land.listings.find(q => q.id === b.id); if (!l) return err('Lahan tidak tersedia.', 404); const fee = Math.round(l.price * .025), cost = l.price + fee; if (s.cash < cost) return err(`Cash personal tidak cukup. Butuh ${fmt(cost)} termasuk BPHTB dan notaris.`);
    s.cash -= cost; x.land.listings = x.land.listings.filter(q => q !== l); x.land.owned.unshift({ id: uid(), kind: l.kind, city: l.city, name: l.name, sqm: l.sqm, ppsm: l.ppsm, paid: l.price + fee, idx: 1, boughtDay: day, leased: false, dispute: false, hid: l.hid, income: 0, an: l.an }); return done({ ok: true, fee });
  }
  if (p === '/api/v720/land/analyze') {
    const t = b.owned ? x.land.owned.find(q => q.id === b.id) : x.land.listings.find(q => q.id === b.id); if (!t) return err('Lahan tidak ditemukan.', 404); if (t.an) return err('Lahan ini sudah dianalisis.'); if (s.cash < 750000) return err('Biaya analisis lokasi Rp750.000 tidak cukup.');
    s.cash -= 750000; const hd = t.hid, r = rngFor(`${user.id}:an:${t.id}`); t.an = { legal: hd.legal < .025 ? 'Rendah' : hd.legal < .05 ? 'Sedang' : 'Tinggi', flood: hd.flood < .06 ? 'Rendah' : hd.flood < .1 ? 'Sedang' : 'Tinggi', infra: hd.infra, grow: Math.round(hd.mu * 1000) / 10, lo: Math.round(Math.exp((hd.mu - hd.vol) * 5) * 100) / 100, hi: Math.round(Math.exp((hd.mu + hd.vol) * 5) * 100) / 100, noise: r() };
    return done({ ok: true, an: t.an });
  }
  if (p === '/api/v720/land/lease') { const t = x.land.owned.find(q => q.id === b.id); if (!t) return err('Lahan tidak ditemukan.', 404); t.leased = Boolean(b.on); return done({ ok: true, leased: t.leased }); }
  if (p === '/api/v720/land/resolve') { const t = x.land.owned.find(q => q.id === b.id); if (!t || !t.dispute) return err('Tidak ada sengketa pada lahan ini.'); const fee = Math.round(landValue(t) * .03); if (s.cash < fee) return err(`Biaya penyelesaian ${fmt(fee)} tidak cukup.`); s.cash -= fee; t.dispute = false; t.idx *= 1.08; return done({ ok: true, fee }); }
  if (p === '/api/v720/land/sell') {
    const t = x.land.owned.find(q => q.id === b.id); if (!t) return err('Lahan tidak ditemukan.', 404); if (t.dispute) return err('Lahan sedang sengketa. Selesaikan terlebih dahulu.'); const val = landValue(t), net = Math.round(val * .95);
    x.land.owned = x.land.owned.filter(q => q !== t); v6.pendingCash.push({ amount: net, dueDay: day + 14, label: `Jual ${t.name}` }); return done({ ok: true, net, settleDays: 14, realized: net - Math.round(t.paid) });
  }

  /* auctions */
  if (p === '/api/v720/auction/bid' || p === '/api/v720/auction/auto') {
    const a = x.auctions.find(q => q.id === b.id && !q.done); if (!a || day >= a.endDay) return err('Lelang sudah berakhir.', 404); const auto = p.endsWith('auto');
    if (auto) { const mx = Math.round(num(b.max)); if (mx <= 0) { a.maxAuto = 0; return done({ ok: true }); } if (mx < (a.current ? a.current + a.minInc : a.start)) return err('Batas auto-bid harus di atas penawaran berikutnya.'); a.maxAuto = mx; }
    if (a.bidder !== 'you') { const amt = a.current ? a.current + a.minInc : a.start, need = Math.round(amt * 1.05); if (s.cash < need) return err(`Cash personal tidak cukup. Butuh ${fmt(need)} termasuk biaya lelang 5%.`); s.cash -= need; a.deposit = need; a.current = amt; a.bidder = 'you'; a.hist.push({ d: day, amt, who: 'you' }); }
    else if (!auto) return err('Anda sudah menjadi penawar tertinggi.');
    return done({ ok: true, current: a.current });
  }

  /* courses */
  if (p === '/api/v720/course/start') {
    const c = COURSES.find(q => q.id === clean(b.courseId, 20)); if (!c) return err('Kursus tidak ditemukan.', 404); const st = (x.courses[c.id] ||= { done: 0 }), lk = lockOf(s, x, c); if (lk) return err(lk + '.'); if (st.cert) return err('Kursus sudah selesai.');
    if (x.lessons.some(l => l.course === c.id)) return err('Pelajaran kursus ini sedang berjalan.'); if (x.lessons.length >= 2) return err('Maksimal 2 pelajaran berjalan bersamaan.');
    const l = c.lessons[st.done]; if (l.min && (s.skills[c.skill] || 0) < l.min) return err(`Skill ${c.skill} minimal ${l.min} untuk pelajaran ini.`); if (s.cash < l.cost) return err(`Cash personal tidak cukup. Butuh ${fmt(l.cost)}.`);
    s.cash -= l.cost; x.lessons.push({ id: uid(), course: c.id, idx: st.done, name: l.n, gains: l.gains, startDay: day, endDay: day + l.days }); return done({ ok: true, endDay: day + l.days });
  }

  /* lifestyle equip */
  if (p === '/api/v720/shop/equip') {
    const it = v.inv.find(q => q.id === b.invId), d = it && SHOP.find(q => q.id === it.itemId); if (!d?.slot) return err('Barang tidak bisa dipakai.', 404);
    if (b.on) { for (const o of v.inv) if (o !== it && SHOP.find(q => q.id === o.itemId)?.slot === d.slot) o.equipped = false; it.equipped = true; } else it.equipped = false; v.bonus = bonusOf(v); return done({ ok: true });
  }

  /* hr extras */
  if (p === '/api/v720/hr/promote') {
    const e = s.employees.find(q => String(q.id) === String(b.id) && q.status === 'active'); if (!e) return err('Karyawan tidak ditemukan.', 404); const xv = e.v700 || (e.v700 = { promoted: 0, loyalty: 60 }), n = xv.promoted || 0; if (n >= 3) return err('Sudah di jabatan tertinggi.'); if (e.morale < 50) return err('Moral karyawan harus minimal 50 untuk dipromosikan.');
    const base = e.role.replace(/^(Senior|Lead|Head) /, ''); e.role = `${['Senior', 'Lead', 'Head'][n]} ${base}`; e.salary = Math.round(e.salary * 1.15 / 50000) * 50000; e.productivity = Math.min(100, e.productivity + 5); e.skill = Math.min(100, e.skill + 3); xv.promoted = n + 1; xv.loyalty = Math.min(100, (xv.loyalty || 60) + 10); e.morale = Math.min(100, e.morale + 8);
    return done({ ok: true, role: e.role, salary: e.salary });
  }
  if (p === '/api/v720/hr/reject') { const n = v.hr.cand.length; v.hr.cand = v.hr.cand.filter(q => q.id !== b.candId); if (v.hr.cand.length === n) return err('Kandidat tidak ditemukan.', 404); x.short = x.short.filter(q => q !== b.candId); return done({ ok: true }); }
  if (p === '/api/v720/hr/shortlist') { const id = clean(b.candId, 30); if (!v.hr.cand.some(q => q.id === id)) return err('Kandidat tidak ditemukan.', 404); x.short = x.short.includes(id) ? x.short.filter(q => q !== id) : [...x.short, id]; return done({ ok: true, on: x.short.includes(id) }); }

  /* incidents */
  if (p === '/api/v720/incident/claim' || p === '/api/v720/incident/repair') {
    const inc = s.incidents.find(q => String(q.id) === String(b.id) && (q.status === 'active' || q.status === 'recovery')), biz = inc && findBiz(s, inc.business_id); if (!inc || !biz) return err('Insiden aktif tidak ditemukan.', 404); inc.v720 ||= { claimed: false };
    if (p.endsWith('claim')) { if (!v.inv.some(q => q.itemId === 'ins-biz' && q.expires > day)) return err('Anda belum memiliki Asuransi Usaha aktif. Beli di Shop kategori Proteksi.'); if (inc.v720.claimed) return err('Klaim sudah diajukan.'); const pay = Math.round(inc.damage_value * .7); biz.cash += pay; inc.insurance_payout = pay; inc.v720.claimed = true; return done({ ok: true, payout: pay }); }
    if (day - (inc.data?.day ?? day) < 2) return err('Penilaian kerusakan masih berjalan. Perbaikan dapat dimulai 2 hari setelah kejadian.'); if (biz.cash < inc.repair_cost) return err(`Kas bisnis tidak cukup. Biaya perbaikan ${fmt(inc.repair_cost)}.`);
    biz.cash -= inc.repair_cost; biz.value += Math.round(inc.damage_value * .85); inc.status = 'resolved'; inc.decision = 'repair'; return done({ ok: true, cost: inc.repair_cost });
  }

  /* brokers */
  if (p === '/api/v720/broker/select') {
    const bk = b.id === 'default' ? BROKER_BASE : b.id === 'mine' ? (x.myBroker && { id: 'mine', name: x.myBroker.name, buy: Math.max(x.myBroker.buy, .0008), sell: x.myBroker.sell, min: 0 }) : x.brokers.find(q => q.id === b.id && q.status === 'open'); if (!bk) return err('Broker tidak tersedia.', 404); if (s.cash < (bk.min || 0)) return err(`Saldo minimum ${fmt(bk.min)} belum terpenuhi.`);
    x.broker = bk.id; v.brokerFee = { buy: bk.buy, sell: bk.sell }; return done({ ok: true });
  }
  if (p === '/api/v720/broker/open') {
    if (x.myBroker) return err('Anda sudah memiliki perusahaan sekuritas.'); const name = clean(b.name, 40); if (name.length < 3) return err('Nama perusahaan minimal 3 karakter.'); if (s.cash < MYBROKER.cost) return err(`Modal dan izin usaha ${fmt(MYBROKER.cost)} tidak cukup.`);
    s.cash -= MYBROKER.cost; x.myBroker = { name, openDay: day, rep: 30, clients: 0, buy: .0012, sell: .0025, cash: 0, tech: 0, research: 0, total: 0, promoUntil: 0, rev30: [] }; achievement(s, 'broker', 'Broker'); news(v, day, 'broker', `${name} resmi mengantongi izin broker`, 'Perusahaan sekuritas baru siap menerima nasabah.', 'up'); return done({ ok: true });
  }
  if (p.startsWith('/api/v720/broker/') && !x.myBroker) return err('Anda belum memiliki perusahaan sekuritas.');
  if (p === '/api/v720/broker/settings') { const bu = num(b.buy), se = num(b.sell); if (bu < MYBROKER.minFee || bu > MYBROKER.maxFee || se < MYBROKER.minFee || se > MYBROKER.maxFee) return err(`Biaya harus antara ${(MYBROKER.minFee * 100).toFixed(2)}% dan ${(MYBROKER.maxFee * 100).toFixed(2)}%.`); x.myBroker.buy = bu; x.myBroker.sell = se; return done({ ok: true }); }
  if (p === '/api/v720/broker/upgrade') { const k = b.what === 'research' ? 'research' : 'tech', m2 = x.myBroker, l = m2[k]; if (l >= MYBROKER.max) return err('Level maksimum.'); const cost = MYBROKER.upCost(l); if (m2.cash < cost) return err(`Kas sekuritas tidak cukup. Butuh ${fmt(cost)}.`); m2.cash -= cost; m2[k] = l + 1; return done({ ok: true, level: l + 1 }); }
  if (p === '/api/v720/broker/promo') { const m2 = x.myBroker; if (m2.promoUntil > day) return err('Promo masih berjalan.'); if (m2.cash < 25e6) return err('Kas sekuritas minimal Rp25 juta untuk promo.'); m2.cash -= 25e6; m2.promoUntil = day + 30; return done({ ok: true, until: day + 30 }); }
  if (p === '/api/v720/broker/withdraw') { const m2 = x.myBroker, amt = Math.round(Math.min(num(b.amount) || m2.cash, m2.cash)); if (amt <= 0) return err('Kas sekuritas kosong.'); m2.cash -= amt; s.cash += amt; return done({ ok: true, amount: amt }); }

  /* creator studio */
  if (p === '/api/v720/creator/studio') { const l = x.studio || 0; if (l >= STUDIO.max) return err('Studio sudah level maksimum.'); const cost = STUDIO.costs[l]; if (s.cash < cost) return err(`Cash personal tidak cukup. Butuh ${fmt(cost)}.`); s.cash -= cost; x.studio = l + 1; v.studioLv = x.studio; v.bonus = bonusOf(v); return done({ ok: true, level: x.studio }); }

  /* branches with location analysis */
  if (p === '/api/v720/branch/analyze' || p === '/api/v720/branch/openAt') {
    const biz = findBiz(s, b.businessId), cat = biz && h.businessCatalog.find(q => q.id === biz.catalogId); if (!biz || !cat) return err('Business tidak ditemukan.', 404); const n = biz.v700?.branches || 0; if (n >= 8) return err('Maksimal 8 cabang.');
    const r = rngFor(`${user.id}:br:${biz.id}:${n}`), names = [...BRANCH_CITIES].sort(() => r() - .5).slice(0, 4), locs = names.map((nm, i) => ({ id: `l${i}`, name: nm, demand: Math.round(50 + r() * 45), rent: Math.round((.85 + r() * .55) * 100) / 100, comp: Math.round(20 + r() * 70), nz: [r() - .5, r() - .5, r() - .5] }));
    const cost = Math.round(cat.startup * .7 * Math.pow(1.5, n) / 10000) * 10000;
    if (p.endsWith('analyze')) { const ver = Boolean(b.verify); if (ver) { if (biz.cash < 1500000) return err('Kas bisnis tidak cukup untuk analisis (Rp1.500.000).'); if (!biz.v700?.brAn?.[n]) { biz.cash -= 1500000; biz.v700 = { ...(biz.v700 || {}), brAn: { ...(biz.v700?.brAn || {}), [n]: true } }; } }
      const ok = Boolean(biz.v700?.brAn?.[n]); await save(user, s); return json({ ok: true, cost, verified: ok, locs: locs.map(l => ok ? { id: l.id, name: l.name, demand: l.demand, rent: l.rent, comp: l.comp } : { id: l.id, name: l.name, demand: clamp(Math.round(l.demand + l.nz[0] * 30), 30, 99), rent: Math.round((l.rent + l.nz[1] * .3) * 100) / 100, comp: clamp(Math.round(l.comp + l.nz[2] * 40), 5, 99) }) }); }
    const loc = locs.find(l => l.id === b.locId); if (!loc) return err('Lokasi tidak valid.'); if (biz.cash < cost) return err(`Kas bisnis kurang. Butuh ${fmt(cost)}.`);
    const capMult = 1 + .25 * clamp(.5 + (loc.demand - 50) / 60 - (loc.comp - 50) / 150, .6, 1.4), fixMult = 1 + .18 * loc.rent; biz.cash -= cost; biz.v700 = { ...(biz.v700 || {}), branches: n + 1, branchList: [...(biz.v700?.branchList || []), { name: loc.name, day, demand: loc.demand, rent: loc.rent }] };
    const ops = biz.operations || (biz.operations = {}); ops.capacity = R((ops.capacity || 50) * capMult); ops.monthlyFixed = R((ops.monthlyFixed || 0) * fixMult); for (const q of s.products.filter(z => String(z.business_id) === String(biz.id))) q.capacity = R(q.capacity * capMult);
    biz.value += Math.round(cost * .6); biz.reputation = Math.min(100, (biz.reputation || 0) + 1); news(v, day, 'business', `${biz.name} membuka cabang di ${loc.name}`, `Kapasitas naik ${Math.round((capMult - 1) * 100)}% dan biaya tetap naik ${Math.round((fixMult - 1) * 100)}%.`, 'up', { biz: biz.id });
    return done({ ok: true, branches: n + 1, cost, capPct: Math.round((capMult - 1) * 100), loc: loc.name });
  }
  return err('API_NOT_FOUND', 404);
}
