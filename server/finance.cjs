// BIZSIM PERSONAL FINANCE — server-side (sumber kebenaran untuk rekening, kartu, dompet digital, kartu kredit, pesanan).
// Semua saldo, limit, biaya, jam layanan, PIN, dan status transaksi divalidasi DI SERVER.
// Uang tunai hidup di save game (S.player.balance); server mengubahnya hanya lewat "cash adjustment" bernomor urut
// (fin_seq) sehingga save lama dari klien tidak bisa menimpa potongan/penambahan tunai yang sudah dikonfirmasi.
// Ini simulasi game — bukan integrasi ke bank, dompet digital, atau QRIS nyata.
const crypto = require('crypto');
const L = require('./life-catalog.cjs');
const CAL = require('./calendar.cjs');

const SEC_DAY = 86_400, WARM = 14;
const absOf = (day, sec) => (day + WARM) * SEC_DAY + sec;
const mod = (a, n) => ((a % n) + n) % n;
const dom = d => mod(d, 30) + 1, monthKey = d => Math.floor(d / 30), wd = d => mod(d + 1, 7);
const fmt = n => 'Rp ' + Math.round(n).toLocaleString('id-ID');
const STATUS = ['pending', 'berhasil', 'gagal', 'reversed'];

module.exports = function mountFinance(app, H) {
  const { db, tx: dbTx, vid, rid, now, fail, getPlayer, ageAt } = H;
  // Skema dibuat lewat migrate() yang dipanggil server.cjs (malas + dapat diulang), bukan saat modul dimuat.
  const SCHEMA = `
  CREATE TABLE IF NOT EXISTS fin_state (visitor TEXT PRIMARY KEY, pin_hash TEXT, pin_salt TEXT, pin_fails INTEGER DEFAULT 0, pin_locked_until INTEGER DEFAULT 0, score INTEGER, last_day INTEGER, autodebit TEXT);
  CREATE TABLE IF NOT EXISTS fin_accounts (id TEXT PRIMARY KEY, visitor TEXT, kind TEXT, provider TEXT, label TEXT, balance INTEGER DEFAULT 0, credit_limit INTEGER DEFAULT 0, status TEXT, opened_day INTEGER, meta TEXT);
  CREATE TABLE IF NOT EXISTS fin_cards (id TEXT PRIMARY KEY, visitor TEXT, account_id TEXT, type TEXT, form TEXT, last4 TEXT, status TEXT, created_day INTEGER);
  CREATE TABLE IF NOT EXISTS fin_tx (id TEXT PRIMARY KEY, visitor TEXT, idem TEXT, kind TEXT, status TEXT, amount INTEGER, fee INTEGER, method TEXT, src TEXT, dst TEXT, merchant TEXT, label TEXT, reason TEXT, day INTEGER, sec INTEGER, created INTEGER, reversal_of TEXT, resp TEXT, UNIQUE(visitor, idem));
  CREATE TABLE IF NOT EXISTS fin_statements (id TEXT PRIMARY KEY, visitor TEXT, account_id TEXT, stmt_day INTEGER, due_day INTEGER, amount INTEGER, min_due INTEGER, paid INTEGER DEFAULT 0, status TEXT, interest INTEGER DEFAULT 0, late_fee INTEGER DEFAULT 0);
  CREATE TABLE IF NOT EXISTS fin_orders (id TEXT PRIMARY KEY, visitor TEXT, merchant TEXT, items TEXT, total INTEGER, method TEXT, tx_id TEXT, placed_abs INTEGER, ready_abs INTEGER, eta_abs INTEGER, status TEXT, created INTEGER);
  CREATE TABLE IF NOT EXISTS fin_cash_log (visitor TEXT, seq INTEGER, delta INTEGER, cat TEXT, label TEXT, tx_id TEXT, PRIMARY KEY (visitor, seq));
  `;
  function migrate() {
    db.exec(SCHEMA);
    for (const ix of [
      'CREATE INDEX IF NOT EXISTS ix_fin_accounts_v ON fin_accounts (visitor)',
      'CREATE INDEX IF NOT EXISTS ix_fin_cards_v ON fin_cards (visitor, account_id)',
      'CREATE INDEX IF NOT EXISTS ix_fin_tx_v ON fin_tx (visitor, day, sec)',
      'CREATE INDEX IF NOT EXISTS ix_fin_stmt_acc ON fin_statements (account_id, status)',
      'CREATE INDEX IF NOT EXISTS ix_fin_orders_v ON fin_orders (visitor, placed_abs)',
    ]) { try { db.exec(ix); } catch { /* opsional */ } }
  }

  const bank = id => L.BANKS.find(b => b.id === id), wallet = id => L.WALLETS.find(w => w.id === id);
  const merchant = id => L.MERCHANTS.find(m => m.id === id), item = id => L.ITEMS.find(i => i.id === id);
  const product = id => L.CREDIT_PRODUCTS.find(p => p.id === id);
  const st = v => { let s = db.prepare('SELECT * FROM fin_state WHERE visitor=?').get(v); if (!s) { db.prepare('INSERT INTO fin_state (visitor, score, last_day, autodebit) VALUES (?,?,?,?)').run(v, null, null, '{}'); s = db.prepare('SELECT * FROM fin_state WHERE visitor=?').get(v); } return s; };
  const accts = v => db.prepare('SELECT * FROM fin_accounts WHERE visitor=? ORDER BY opened_day, rowid').all(v).map(a => ({ ...a, meta: JSON.parse(a.meta || '{}') }));
  const acct = (v, id) => { const a = db.prepare('SELECT * FROM fin_accounts WHERE visitor=? AND id=?').get(v, id); return a ? { ...a, meta: JSON.parse(a.meta || '{}') } : null; };
  const putAcct = a => db.prepare('UPDATE fin_accounts SET balance=?, credit_limit=?, status=?, meta=? WHERE id=?').run(Math.round(a.balance), a.credit_limit, a.status, JSON.stringify(a.meta), a.id);
  const cardOf = (v, accountId) => db.prepare('SELECT * FROM fin_cards WHERE visitor=? AND account_id=?').get(v, accountId);
  const nameOf = a => a.kind === 'bank' ? bank(a.provider).short : a.kind === 'wallet' ? wallet(a.provider).name : `Kartu kredit ${product(a.provider).name}`;

  // ——— jam & validasi waktu game ———
  function clockOf(req, p) {
    const c = req.body?.clock || {}, day = Number(c.day), sec = Number(c.sec);
    if (!Number.isInteger(day) || day < 0 || !Number.isFinite(sec) || sec < 0 || sec >= SEC_DAY) return { error: 'Jam simulasi tidak valid.' };
    const row = db.prepare('SELECT clock_abs FROM players WHERE visitor=?').get(p.visitor) || {};
    const abs = absOf(day, Math.floor(sec));
    if (row.clock_abs != null && abs + 2 < row.clock_abs) return { error: 'Jam simulasi tertinggal dari save di server. Muat ulang halaman.' };
    return { day, sec: Math.floor(sec), abs };
  }
  const openAt = (m, day, sec) => { const h = sec / 3600; if (m.days && !m.days.includes(wd(day))) return false; return h >= m.hours[0] && h < m.hours[1]; };
  const hoursTxt = m => `${String(m.hours[0]).padStart(2, '0')}:00–${m.hours[1] === 24 ? '24:00' : String(m.hours[1]).padStart(2, '0') + ':00'}${m.days ? ' (Senin–Sabtu)' : ''}`;
  const tellerOpen = (b, day, sec) => b.teller && b.teller.days.includes(wd(day)) && sec / 3600 >= b.teller.from && sec / 3600 < b.teller.to;

  // ——— PIN (scrypt + salt, tidak pernah disimpan plaintext) ———
  const hashPin = (pin, salt) => crypto.scryptSync(String(pin), salt, 32).toString('hex');
  function checkPin(v, pin) {
    const s = st(v);
    if (!s.pin_hash) return 'Buat PIN transaksi dulu di Personal Finance.';
    if (s.pin_locked_until > now()) return `PIN terkunci karena 3× salah. Coba lagi dalam ${Math.ceil((s.pin_locked_until - now()) / 1000)} detik.`;
    if (!/^\d{6}$/.test(String(pin || ''))) return 'PIN harus 6 digit.';
    const ok = crypto.timingSafeEqual(Buffer.from(hashPin(pin, s.pin_salt), 'hex'), Buffer.from(s.pin_hash, 'hex'));
    if (!ok) { const f = s.pin_fails + 1; db.prepare('UPDATE fin_state SET pin_fails=?, pin_locked_until=? WHERE visitor=?').run(f >= 3 ? 0 : f, f >= 3 ? now() + 60_000 : 0, v); return f >= 3 ? 'PIN salah 3×. PIN dikunci 60 detik.' : `PIN salah (${f}/3).`; }
    if (s.pin_fails) db.prepare('UPDATE fin_state SET pin_fails=0 WHERE visitor=?').run(v);
    return null;
  }

  // ——— uang tunai di save game ———
  function cashOf(p) { return Math.floor(p.game?.player?.balance ?? 0); }
  function cashApply(p, delta, cat, label, txId) {
    const row = db.prepare('SELECT fin_seq FROM players WHERE visitor=?').get(p.visitor) || {};
    const seq = (row.fin_seq || 0) + 1;
    p.game.player.balance = Math.round(p.game.player.balance + delta); p.game.finSeq = seq;
    db.prepare('UPDATE players SET game=?, fin_seq=? WHERE visitor=?').run(JSON.stringify(p.game), seq, p.visitor);
    db.prepare('INSERT INTO fin_cash_log (visitor, seq, delta, cat, label, tx_id) VALUES (?,?,?,?,?,?)').run(p.visitor, seq, Math.round(delta), cat, label, txId);
    return { seq, delta: Math.round(delta), cat, label };
  }

  // ——— transaksi ———
  function findIdem(v, idem) { const t = db.prepare('SELECT resp FROM fin_tx WHERE visitor=? AND idem=?').get(v, idem); return t?.resp ? JSON.parse(t.resp) : null; }
  function addTx(v, t) {
    const id = rid('tx');
    if (!STATUS.includes(t.status)) throw new Error('status transaksi tidak dikenal');
    // Binding POSITIONAL (driver libsql/Turso tidak andal untuk @nama).
    db.prepare('INSERT INTO fin_tx (id, visitor, idem, kind, status, amount, fee, method, src, dst, merchant, label, reason, day, sec, created, reversal_of) VALUES (?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?)')
      .run(id, v, t.idem || rid('auto'), t.kind, t.status, Math.round(t.amount), Math.round(t.fee || 0), t.method || null, t.src || null, t.dst || null, t.merchant || null, t.label, t.reason || null, t.day, t.sec ?? 0, now(), t.reversal_of || null);
    return id;
  }
  const setResp = (id, resp) => db.prepare('UPDATE fin_tx SET resp=? WHERE id=?').run(JSON.stringify(resp), id);
  const txRow = id => db.prepare('SELECT * FROM fin_tx WHERE id=?').get(id);

  // ——— batas harian & bulanan (disimpan per akun) ———
  const use = (a, day, k) => (a.meta.use && a.meta.use.day === day ? a.meta.use[k] || 0 : 0);
  const addUse = (a, day, k, n) => { if (!a.meta.use || a.meta.use.day !== day) a.meta.use = { day }; a.meta.use[k] = (a.meta.use[k] || 0) + n; };
  const monthTransfers = (a, day) => (a.meta.tm && a.meta.tm.m === monthKey(day) ? a.meta.tm.n : 0);
  const addMonthTransfer = (a, day) => { const m = monthKey(day); if (!a.meta.tm || a.meta.tm.m !== m) a.meta.tm = { m, n: 0 }; a.meta.tm.n++; };
  const walletMax = a => a.meta.verified ? wallet(a.provider).verifiedMax : wallet(a.provider).basicMax;
  const creditAvail = a => a.credit_limit - a.balance;

  // ——— debit sumber dana (mengembalikan error atau null; mutasi dilakukan pemanggil di dalam transaksi db) ———
  function debitSource(p, src, amount, clk, kind) {
    if (src.type === 'cash') { if (cashOf(p) < amount) return `Uang tunai tidak cukup (${fmt(cashOf(p))}, butuh ${fmt(amount)}).`; return null; }
    const a = src.acct; if (!a || a.status !== 'aktif') return 'Akun tidak aktif.';
    if (a.kind === 'credit') { if (creditAvail(a) < amount) return `Limit tersedia tidak cukup (${fmt(creditAvail(a))}, butuh ${fmt(amount)}).`; return null; }
    if (a.kind === 'wallet' && amount > wallet(a.provider).perTx) return `Melebihi batas per transaksi ${fmt(wallet(a.provider).perTx)}.`;
    if (a.balance < amount) return `Saldo ${nameOf(a)} tidak cukup (${fmt(a.balance)}, butuh ${fmt(amount)}).`;
    if (a.kind === 'bank' && kind === 'debit' && use(a, clk.day, 'debit') + amount > bank(a.provider).debitDaily) return `Melebihi limit kartu debit harian ${fmt(bank(a.provider).debitDaily)}.`;
    return null;
  }
  function applyDebit(p, src, amount, clk, kind, cat, label, txId) {
    if (src.type === 'cash') return cashApply(p, -amount, cat, label, txId);
    const a = src.acct;
    if (a.kind === 'credit') a.balance += amount; else a.balance -= amount;
    if (a.kind === 'bank' && kind === 'debit') addUse(a, clk.day, 'debit', amount);
    putAcct(a); return null;
  }
  function refund(p, src, amount, cat, label, txId) {
    if (src.type === 'cash') return cashApply(p, amount, cat, label, txId);
    const a = acct(p.visitor, src.acct.id); if (a.kind === 'credit') a.balance = Math.max(0, a.balance - amount); else a.balance += amount; putAcct(a); return null;
  }

  // Menentukan sumber dana dari metode checkout + pilihan pemain. Hanya metode yang diterima merchant yang lolos.
  function resolveMethod(v, m, method, sourceId) {
    const allowed = m.methods;
    const walletOk = id => allowed.includes('wallet') || allowed.includes('wallet:' + id);
    if (method === 'cash') return allowed.includes('cash') ? { type: 'cash', label: 'Tunai' } : { error: `${m.name} tidak menerima tunai.` };
    if (method === 'cod') return allowed.includes('cod') ? { type: 'cash', cod: true, label: 'Bayar di tempat (COD)' } : { error: 'COD tidak tersedia.' };
    const a = sourceId ? acct(v, sourceId) : null;
    if (!a) return { error: 'Pilih sumber dana.' };
    if (a.status !== 'aktif') return { error: `${nameOf(a)} sedang tidak aktif.` };
    if (method === 'debit') { if (!allowed.includes('debit')) return { error: `${m.name} tidak menerima kartu debit.` }; if (a.kind !== 'bank') return { error: 'Kartu debit harus terhubung ke rekening bank.' }; const c = cardOf(v, a.id); if (!c) return { error: 'Rekening ini belum punya kartu debit.' }; if (c.status !== 'aktif') return { error: `Kartu debit •••• ${c.last4} sedang ${c.status}.` }; return { type: 'acct', acct: a, kind: 'debit', label: `Debit ${bank(a.provider).short} •••• ${c.last4}` }; }
    if (method === 'credit') { if (!allowed.includes('credit')) return { error: `${m.name} tidak menerima kartu kredit.` }; if (a.kind !== 'credit') return { error: 'Pilih kartu kredit.' }; const c = cardOf(v, a.id); if (c?.status !== 'aktif') return { error: 'Kartu kredit sedang nonaktif.' }; return { type: 'acct', acct: a, kind: 'credit', label: `Kredit •••• ${c.last4}` }; }
    if (method === 'qris') { if (!allowed.includes('qris')) return { error: `${m.name} tidak menyediakan QRIS.` }; if (a.kind === 'wallet' && wallet(a.provider).qris) return { type: 'acct', acct: a, kind: 'qris', label: `QRIS · ${wallet(a.provider).name}` }; if (a.kind === 'bank') return { type: 'acct', acct: a, kind: 'qris', label: `QRIS · m-banking ${bank(a.provider).short}` }; return { error: 'Sumber dana ini tidak mendukung QRIS (kartu kredit tidak bisa untuk QRIS di simulasi ini).' }; }
    if (method === 'wallet') { if (a.kind !== 'wallet') return { error: 'Pilih dompet digital.' }; if (!walletOk(a.provider)) return { error: `${m.name} tidak menerima ${wallet(a.provider).name}.` }; return { type: 'acct', acct: a, kind: 'wallet', label: wallet(a.provider).name }; }
    if (method === 'transfer') { if (!allowed.includes('transfer')) return { error: 'Transfer bank tidak tersedia.' }; if (a.kind !== 'bank') return { error: 'Pilih rekening bank.' }; return { type: 'acct', acct: a, kind: 'transfer', label: `Transfer VA · ${bank(a.provider).short}` }; }
    return { error: 'Metode pembayaran tidak dikenal.' };
  }

  function quote(p, m, items, method, clk) {
    const lines = []; let sub = 0; const age = ageAt(p.profile, clk.day);
    for (const r of items || []) {
      const it = item(r.id), qty = Math.max(1, Math.min(20, Math.floor(Number(r.qty) || 1)));
      if (!it || it.merchant !== m.id) return { error: 'Item tidak tersedia di merchant ini.' };
      const price = it.under18 != null && age < 18 ? it.under18 : it.price;
      lines.push({ id: it.id, name: it.name, qty, price, total: price * qty }); sub += price * qty;
    }
    if (!lines.length) return { error: 'Keranjang kosong.' };
    const fees = [];
    if (m.id === 'antarrasa') { fees.push({ label: 'Ongkos kirim', amount: L.DELIVERY.deliveryFee }, { label: 'Biaya layanan', amount: L.DELIVERY.serviceFee }); }
    if (m.id === 'pasarku') { fees.push({ label: 'Ongkos kirim', amount: L.MARKET_SHIP.fee }); if (method === 'cod') fees.push({ label: 'Biaya COD', amount: L.MARKET_SHIP.codFee }); }
    const total = sub + fees.reduce((s, f) => s + f.amount, 0);
    return { lines, fees, sub, total };
  }

  // ———————————————————————— credit statements, admin fees (proses harian, idempoten) ————————————————————————
  function advance(p, toDay) {
    const v = p.visitor, s = st(v); let from = s.last_day == null ? toDay : s.last_day + 1; if (toDay - from > 400) from = toDay - 400;
    let score = s.score;
    if (from <= toDay) {
      // Dimuat SEKALI per permintaan (bukan per hari): dengan database remote setiap query adalah satu round-trip,
      // sehingga loop 400 hari yang memanggil accts()/query per hari bisa melewati batas waktu fungsi Vercel.
      const all = accts(v).filter(a => a.status === 'aktif');
      const banks = all.filter(a => a.kind === 'bank'), credits = all.filter(a => a.kind === 'credit');
      const open = credits.length ? db.prepare("SELECT * FROM fin_statements WHERE visitor=? AND status='terbuka'").all(v) : [];
      for (let d = from; d <= toDay; d++) {
        if (dom(d) === 30) for (const a of banks) {
          const fee = bank(a.provider).adminMonthly; if (!fee || a.opened_day > d - 1) continue;
          const take = Math.max(0, Math.min(fee, a.balance)); a.balance -= take; putAcct(a);
          addTx(v, { kind: 'biaya_admin', status: take > 0 ? 'berhasil' : 'gagal', amount: -take, method: 'autodebet', src: a.id, label: `Biaya admin bulanan ${bank(a.provider).short}`, reason: take < fee ? `Saldo hanya cukup ${fmt(take)} dari ${fmt(fee)}` : null, day: d, sec: SEC_DAY - 1 });
        }
        for (const a of credits) {
          const pr = product(a.provider);
          if (dom(d) === pr.statementDate && a.opened_day < d) {
            const amount = Math.round(a.balance);
            if (amount > 0) {
              const min = Math.min(amount, Math.max(pr.minPayFloor, Math.round(amount * pr.minPayPct)));
              const row = { id: rid('st'), visitor: v, account_id: a.id, stmt_day: d, due_day: d + pr.graceDays, amount, min_due: min, paid: 0, status: 'terbuka', interest: 0, late_fee: 0 };
              db.prepare('INSERT INTO fin_statements (id, visitor, account_id, stmt_day, due_day, amount, min_due, paid, status) VALUES (?,?,?,?,?,?,?,0,?)').run(row.id, v, a.id, d, row.due_day, amount, min, 'terbuka');
              open.push(row);
              if (amount / a.credit_limit > L.CREDIT_RULES.highUtilAt) score += L.CREDIT_RULES.highUtil;
            }
          }
          for (const sm of open.filter(x => x.account_id === a.id && x.status === 'terbuka' && x.due_day === d)) {
            if (sm.paid >= sm.amount) { sm.status = 'lunas'; db.prepare("UPDATE fin_statements SET status='lunas' WHERE id=?").run(sm.id); score += L.CREDIT_RULES.onTime; continue; }
            const unpaid = sm.amount - sm.paid, interest = Math.round(unpaid * pr.interestMonthly);
            if (sm.paid >= sm.min_due) {
              a.balance += interest; putAcct(a); score += L.CREDIT_RULES.minOnly; sm.status = 'minimum';
              db.prepare("UPDATE fin_statements SET status='minimum', interest=? WHERE id=?").run(interest, sm.id);
              addTx(v, { kind: 'bunga', status: 'berhasil', amount: -interest, method: 'kredit', src: a.id, label: `Bunga kartu kredit ${(pr.interestMonthly * 100).toLocaleString('id-ID')}% dari sisa ${fmt(unpaid)}`, day: d, sec: SEC_DAY - 1 });
            } else {
              a.balance += interest + pr.lateFee; putAcct(a); score += L.CREDIT_RULES.late; sm.status = 'telat';
              db.prepare("UPDATE fin_statements SET status='telat', interest=?, late_fee=? WHERE id=?").run(interest, pr.lateFee, sm.id);
              addTx(v, { kind: 'denda', status: 'berhasil', amount: -(interest + pr.lateFee), method: 'kredit', src: a.id, label: `Denda keterlambatan ${fmt(pr.lateFee)} + bunga ${fmt(interest)}`, reason: `Pembayaran ${fmt(sm.paid)} di bawah minimum ${fmt(sm.min_due)}`, day: d, sec: SEC_DAY - 1 });
            }
          }
        }
      }
    }
    if (score != null) score = Math.max(L.CREDIT_RULES.scoreMin, Math.min(L.CREDIT_RULES.scoreMax, score));
    db.prepare('UPDATE fin_state SET last_day=?, score=? WHERE visitor=?').run(Math.max(toDay, s.last_day ?? toDay), score, v);
  }

  // ———————————————————————— status pesanan dari jam game ————————————————————————
  const orderStatus = (o, abs) => ['diterima', 'dibatalkan', 'gagal'].includes(o.status) ? o.status : abs >= o.eta_abs ? 'tiba' : abs >= o.ready_abs ? 'diantar' : 'diproses';

  function view(p, abs) {
    const v = p.visitor, s = st(v);
    const a = accts(v).map(x => ({ id: x.id, kind: x.kind, provider: x.provider, name: nameOf(x), balance: x.balance, limit: x.credit_limit, available: x.kind === 'credit' ? creditAvail(x) : x.balance, status: x.status, openedDay: x.opened_day, verified: !!x.meta.verified, transfersThisMonth: x.meta.tm?.n || 0, use: x.meta.use || null, max: x.kind === 'wallet' ? walletMax(x) : null }));
    const cards = db.prepare('SELECT id, account_id AS accountId, type, form, last4, status, created_day AS createdDay FROM fin_cards WHERE visitor=?').all(v);
    const tx = db.prepare('SELECT id, kind, status, amount, fee, method, src, dst, merchant, label, reason, day, sec, reversal_of AS reversalOf FROM fin_tx WHERE visitor=? ORDER BY day DESC, sec DESC, created DESC LIMIT 200').all(v);
    const statements = db.prepare('SELECT id, account_id AS accountId, stmt_day AS stmtDay, due_day AS dueDay, amount, min_due AS minDue, paid, status, interest, late_fee AS lateFee FROM fin_statements WHERE visitor=? ORDER BY stmt_day DESC LIMIT 24').all(v);
    const orders = db.prepare('SELECT * FROM fin_orders WHERE visitor=? ORDER BY placed_abs DESC LIMIT 30').all(v).map(o => ({ id: o.id, merchant: o.merchant, items: JSON.parse(o.items), total: o.total, method: o.method, txId: o.tx_id, placedAbs: o.placed_abs, readyAbs: o.ready_abs, etaAbs: o.eta_abs, status: abs != null ? orderStatus(o, abs) : o.status }));
    const seq = (db.prepare('SELECT fin_seq FROM players WHERE visitor=?').get(v) || {}).fin_seq || 0;
    return { ok: true, accounts: a, cards, tx, statements, orders, score: s.score, pinSet: !!s.pin_hash, pinLocked: s.pin_locked_until > now(), autodebit: JSON.parse(s.autodebit || '{}'), finSeq: seq, cash: cashOf(p), lastDay: s.last_day };
  }
  const need = (req, res) => { const p = getPlayer(vid(req)); if (!p || !p.profile || !p.game) { fail(res, 'Profil atau save game belum ada.', 404); return null; } return p; };
  // Cegah dua permintaan bersamaan untuk pemain yang sama (mis. double tap / dua tab).
  const busy = new Set();
  const guard = fn => (req, res) => { const v = vid(req); if (busy.has(v)) return res.status(429).json({ ok: false, error: 'Transaksi lain masih diproses. Tunggu sebentar.' }); busy.add(v); try { return fn(req, res); } catch (e) { console.error(e); return fail(res, 'Kesalahan server keuangan.', 500); } finally { busy.delete(v); } };
  const idemOk = idem => typeof idem === 'string' && /^[a-zA-Z0-9:_-]{8,80}$/.test(idem);

  // ———————————————————————— routes ————————————————————————
  app.get('/api/fin/catalog', (req, res) => res.json({ ok: true, ...L }));
  app.get('/api/fin/state', (req, res) => { const p = need(req, res); if (!p) return; const c = req.query.day != null ? absOf(Number(req.query.day), Number(req.query.sec) || 0) : null; res.json(view(p, c)); });
  app.post('/api/fin/advance', guard((req, res) => { const p = need(req, res); if (!p) return; const d = Number(req.body.gameDay); if (!Number.isInteger(d) || d < 0) return fail(res, 'Hari tidak valid.'); advance(p, d); res.json(view(p)); }));
  app.get('/api/fin/cashlog', (req, res) => { const after = Number(req.query.after) || 0; res.json({ ok: true, rows: db.prepare('SELECT seq, delta, cat, label FROM fin_cash_log WHERE visitor=? AND seq>? ORDER BY seq').all(vid(req), after) }); });

  app.post('/api/fin/pin', guard((req, res) => {
    const p = need(req, res); if (!p) return; const s = st(p.visitor), { pin, oldPin } = req.body || {};
    if (!/^\d{6}$/.test(String(pin || ''))) return fail(res, 'PIN harus 6 digit angka.');
    if (/^(\d)\1{5}$/.test(pin) || '0123456789'.includes(pin) || '9876543210'.includes(pin)) return fail(res, 'PIN terlalu mudah ditebak (angka sama/berurutan).');
    if (s.pin_hash) { const e = checkPin(p.visitor, oldPin); if (e) return fail(res, 'PIN lama: ' + e); }
    const salt = crypto.randomBytes(16).toString('hex');
    db.prepare('UPDATE fin_state SET pin_hash=?, pin_salt=?, pin_fails=0, pin_locked_until=0 WHERE visitor=?').run(hashPin(pin, salt), salt, p.visitor);
    res.json({ ...view(p), msg: s.pin_hash ? 'PIN transaksi diganti.' : 'PIN transaksi dibuat. PIN disimpan sebagai hash di server.' });
  }));

  app.post('/api/fin/open', guard((req, res) => {
    const p = need(req, res); if (!p) return; const b = req.body || {}, v = p.visitor;
    if (!idemOk(b.idem)) return fail(res, 'Kunci transaksi tidak valid.'); const dup = findIdem(v, b.idem); if (dup) return res.json(dup);
    const clk = clockOf(req, p); if (clk.error) return fail(res, clk.error);
    const age = ageAt(p.profile, clk.day), pinErr = checkPin(v, b.pin); if (pinErr) return fail(res, pinErr);
    const all = accts(v);
    if (b.kind === 'bank') {
      const bk = bank(b.provider); if (!bk) return fail(res, 'Bank tidak dikenal.');
      if (age < bk.minAge) return fail(res, `${bk.name} mensyaratkan usia minimal ${bk.minAge} tahun (sekarang ${age}).`);
      if (bk.maxAge && age > bk.maxAge) return fail(res, `${bk.name} hanya untuk usia sampai ${bk.maxAge} tahun.`);
      if (all.some(a => a.kind === 'bank' && a.provider === bk.id && a.status !== 'ditutup')) return fail(res, `Kamu sudah punya rekening ${bk.short}.`);
      if (bk.teller && !tellerOpen(bk, clk.day, clk.sec)) return fail(res, `Pembukaan rekening ${bk.short} dilayani di kantor cabang, Senin–Jumat ${bk.teller.from}:00–${bk.teller.to}:00.`);
      const init = Math.floor(Number(b.initial) || 0); if (init < bk.minOpen) return fail(res, `Setoran awal minimal ${fmt(bk.minOpen)}.`);
      if (cashOf(p) < init) return fail(res, `Uang tunai tidak cukup untuk setoran awal (${fmt(cashOf(p))}).`);
      let out;
      dbTx(() => {
        const id = rid('acc'); db.prepare('INSERT INTO fin_accounts (id, visitor, kind, provider, label, balance, credit_limit, status, opened_day, meta) VALUES (?,?,?,?,?,?,0,?,?,?)').run(id, v, 'bank', bk.id, bk.name, init, 'aktif', clk.day, '{}');
        const last4 = String(1000 + Math.floor(Math.random() * 9000));
        db.prepare('INSERT INTO fin_cards (id, visitor, account_id, type, form, last4, status, created_day) VALUES (?,?,?,?,?,?,?,?)').run(rid('cd'), v, id, 'debit', bk.card, last4, 'aktif', clk.day);
        const tx = addTx(v, { idem: b.idem, kind: 'setor', status: 'berhasil', amount: init, method: 'tunai', src: 'cash', dst: id, label: `Buka rekening ${bk.short} + setoran awal`, day: clk.day, sec: clk.sec });
        const adj = init > 0 ? cashApply(p, -init, 'tabungan_bank', `Setoran awal ${bk.short}`, tx) : null;
        out = { ...view(p), msg: `Rekening ${bk.name} dibuka. Kartu debit ${bk.card} •••• ${last4} aktif.`, cashAdj: adj ? [adj] : [] }; setResp(tx, out);
      })();
      return res.json(out);
    }
    if (b.kind === 'wallet') {
      const w = wallet(b.provider); if (!w) return fail(res, 'Dompet tidak dikenal.');
      if (age < 13) return fail(res, `Dompet digital mensyaratkan usia minimal 13 tahun simulasi (sekarang ${age}).`);
      if (all.some(a => a.kind === 'wallet' && a.provider === w.id)) return fail(res, `${w.name} sudah aktif.`);
      let out;
      dbTx(() => {
        const id = rid('acc'); db.prepare('INSERT INTO fin_accounts (id, visitor, kind, provider, label, balance, credit_limit, status, opened_day, meta) VALUES (?,?,?,?,?,0,0,?,?,?)').run(id, v, 'wallet', w.id, w.name, 'aktif', clk.day, JSON.stringify({ verified: false }));
        const tx = addTx(v, { idem: b.idem, kind: 'aktivasi', status: 'berhasil', amount: 0, method: '-', dst: id, label: `Aktivasi ${w.name} (akun basic)`, day: clk.day, sec: clk.sec });
        out = { ...view(p), msg: `${w.name} aktif sebagai akun basic (saldo maks. ${fmt(w.basicMax)}).`, cashAdj: [] }; setResp(tx, out);
      })();
      return res.json(out);
    }
    fail(res, 'Jenis akun tidak dikenal.');
  }));

  app.post('/api/fin/wallet/verify', guard((req, res) => {
    const p = need(req, res); if (!p) return; const a = acct(p.visitor, req.body.account); if (!a || a.kind !== 'wallet') return fail(res, 'Dompet tidak ditemukan.');
    const clk = clockOf(req, p); if (clk.error) return fail(res, clk.error); const pe = checkPin(p.visitor, req.body.pin); if (pe) return fail(res, pe);
    if (ageAt(p.profile, clk.day) < 17) return fail(res, 'Verifikasi (akun premium) butuh identitas usia 17 tahun ke atas.');
    a.meta.verified = true; putAcct(a); res.json({ ...view(p), msg: `${wallet(a.provider).name} terverifikasi. Saldo maksimal ${fmt(wallet(a.provider).verifiedMax)}.` });
  }));

  app.post('/api/fin/card', guard((req, res) => {
    const p = need(req, res); if (!p) return; const c = db.prepare('SELECT * FROM fin_cards WHERE visitor=? AND id=?').get(p.visitor, req.body.card); if (!c) return fail(res, 'Kartu tidak ditemukan.');
    const pe = checkPin(p.visitor, req.body.pin); if (pe) return fail(res, pe);
    const next = req.body.action === 'aktifkan' ? 'aktif' : req.body.action === 'nonaktifkan' ? 'nonaktif' : null; if (!next) return fail(res, 'Aksi kartu tidak dikenal.');
    db.prepare('UPDATE fin_cards SET status=? WHERE id=?').run(next, c.id); res.json({ ...view(p), msg: `Kartu •••• ${c.last4} ${next === 'aktif' ? 'diaktifkan' : 'dinonaktifkan — transaksi dengan kartu ini akan ditolak'}.` });
  }));

  app.post('/api/fin/autodebit', guard((req, res) => {
    const p = need(req, res); if (!p) return; const pe = checkPin(p.visitor, req.body.pin); if (pe) return fail(res, pe);
    const a = req.body.account ? acct(p.visitor, req.body.account) : null; const s = st(p.visitor), ad = JSON.parse(s.autodebit || '{}');
    if (req.body.enable) { if (!a || a.kind !== 'wallet') return fail(res, 'Pilih dompet digital.'); ad[req.body.merchant] = a.id; } else delete ad[req.body.merchant];
    db.prepare('UPDATE fin_state SET autodebit=? WHERE visitor=?').run(JSON.stringify(ad), p.visitor); res.json({ ...view(p), msg: req.body.enable ? 'Autodebet aktif untuk tarif perjalanan harian.' : 'Autodebet dimatikan.' });
  }));

  app.post('/api/fin/credit/apply', guard((req, res) => {
    const p = need(req, res); if (!p) return; const v = p.visitor, pr = product(req.body.product); if (!pr) return fail(res, 'Produk tidak dikenal.');
    const clk = clockOf(req, p); if (clk.error) return fail(res, clk.error); const pe = checkPin(v, req.body.pin); if (pe) return fail(res, pe);
    const age = ageAt(p.profile, clk.day); if (age < pr.minAge) return fail(res, `Kartu kredit mensyaratkan usia minimal ${pr.minAge} tahun (sekarang ${age}).`);
    if (accts(v).some(a => a.kind === 'credit' && a.provider === pr.id && a.status === 'aktif')) return fail(res, 'Kamu sudah punya kartu ini.');
    if (!accts(v).some(a => a.kind === 'bank' && a.status === 'aktif')) return fail(res, 'Butuh rekening bank aktif untuk membayar tagihan kartu.');
    const L30 = (p.game.ledger || []).slice(-30), income = L30.reduce((s, r) => s + Object.entries(r.income || {}).filter(([k]) => !/realized/.test(k)).reduce((a, [, x]) => a + x, 0), 0);
    if (L30.length < 30) return fail(res, `Butuh riwayat pendapatan 30 hari (baru ${L30.length} hari tercatat).`);
    if (income < pr.minIncome) return fail(res, `Pendapatan 30 hari terakhir ${fmt(income)} — minimal ${fmt(pr.minIncome)}.`);
    const s = st(v), score = s.score ?? L.CREDIT_RULES.scoreStart; if (score < pr.minScore) return fail(res, `Skor kredit ${score} di bawah syarat ${pr.minScore}.`);
    const limit = Math.round(Math.min(pr.maxLimit, Math.max(pr.minLimit, income * pr.limitMult)) / 500_000) * 500_000;
    const id = rid('acc'), last4 = String(1000 + Math.floor(Math.random() * 9000));
    dbTx(() => {
      db.prepare('INSERT INTO fin_accounts (id, visitor, kind, provider, label, balance, credit_limit, status, opened_day, meta) VALUES (?,?,?,?,?,0,?,?,?,?)').run(id, v, 'credit', pr.id, pr.name, limit, 'aktif', clk.day, '{}');
      db.prepare('INSERT INTO fin_cards (id, visitor, account_id, type, form, last4, status, created_day) VALUES (?,?,?,?,?,?,?,?)').run(rid('cd'), v, id, 'credit', 'fisik', last4, 'aktif', clk.day);
      db.prepare('UPDATE fin_state SET score=? WHERE visitor=?').run(score, v);
      addTx(v, { kind: 'aktivasi', status: 'berhasil', amount: 0, method: '-', dst: id, label: `Kartu kredit ${pr.name} disetujui · limit ${fmt(limit)}`, day: clk.day, sec: clk.sec });
    })();
    res.json({ ...view(p), msg: `Disetujui. Limit ${fmt(limit)} (dari pendapatan 30 hari ${fmt(income)}). Tagihan tiap tanggal ${pr.statementDate}, jatuh tempo ${pr.graceDays} hari kemudian.` });
  }));

  // ——— checkout merchant ———
  app.post('/api/fin/pay', guard((req, res) => {
    const p = need(req, res); if (!p) return; const b = req.body || {}, v = p.visitor;
    if (!idemOk(b.idem)) return fail(res, 'Kunci transaksi tidak valid.'); const dup = findIdem(v, b.idem); if (dup) return res.json({ ...dup, duplicate: true });
    const clk = clockOf(req, p); if (clk.error) return fail(res, clk.error);
    const m = merchant(b.merchant); if (!m) return fail(res, 'Merchant tidak dikenal.');
    if (!openAt(m, clk.day, clk.sec)) return fail(res, `${m.name} tutup. Jam buka ${hoursTxt(m)}.`);
    const q = quote(p, m, b.items, b.method, clk); if (q.error) return fail(res, q.error);
    const src = resolveMethod(v, m, b.method, b.source); if (src.error) return fail(res, src.error);
    const ad = JSON.parse(st(v).autodebit || '{}'), autoOk = b.auto && src.type === 'acct' && ad[m.id] === src.acct.id;
    if (src.type === 'acct' && !autoOk) { const pe = checkPin(v, b.pin); if (pe) return fail(res, pe); }
    if (q.total === 0) return fail(res, 'Item gratis tidak memerlukan pembayaran.');
    const label = `${m.name}: ${q.lines.map(l => `${l.qty}× ${l.name}`).join(', ')}`;
    const isOrder = m.id === 'antarrasa' || m.id === 'pasarku';
    let out;
    dbTx(() => {
      if (src.cod) {
        const tx = addTx(v, { idem: b.idem, kind: 'belanja', status: 'pending', amount: -q.total, method: 'cod', src: 'cash', merchant: m.id, label, reason: 'Dibayar tunai saat pesanan diterima', day: clk.day, sec: clk.sec });
        const order = makeOrder(v, m, q, 'cod', tx, clk, b.idem);
        out = { ...view(p, clk.abs), txn: txRow(tx), order, quote: q, msg: `Pesanan dibuat. Siapkan uang tunai ${fmt(q.total)} saat pesanan tiba.`, cashAdj: [] }; setResp(tx, out); return;
      }
      const err = debitSource(p, src, q.total, clk, src.kind);
      if (err) { const tx = addTx(v, { idem: b.idem, kind: 'belanja', status: 'gagal', amount: -q.total, method: b.method, src: src.type === 'cash' ? 'cash' : src.acct.id, merchant: m.id, label, reason: err, day: clk.day, sec: clk.sec }); out = { ...view(p, clk.abs), ok: false, error: err, txn: txRow(tx), cashAdj: [] }; setResp(tx, out); return; }
      const tx = addTx(v, { idem: b.idem, kind: 'belanja', status: 'berhasil', amount: -q.total, method: src.kind || b.method, src: src.type === 'cash' ? 'cash' : src.acct.id, merchant: m.id, label: `${label} · ${src.label}`, day: clk.day, sec: clk.sec });
      const adj = applyDebit(p, src, q.total, clk, src.kind, m.cat === 'transport' ? 'transport' : m.cat === 'kesehatan' ? 'kesehatan' : m.cat === 'belanja' ? 'belanja' : m.cat === 'hiburan' ? 'hiburan' : 'makan', label, tx);
      const order = isOrder ? makeOrder(v, m, q, b.method, tx, clk, b.idem) : null;
      out = { ...view(p, clk.abs), txn: txRow(tx), order, quote: q, msg: `Pembayaran ${fmt(q.total)} berhasil (${src.label}).`, cashAdj: adj ? [adj] : [] }; setResp(tx, out);
    })();
    res.status(out.ok === false ? 402 : 200).json(out);
  }));
  app.post('/api/fin/quote', (req, res) => { const p = need(req, res); if (!p) return; const clk = clockOf(req, p); if (clk.error) return fail(res, clk.error); const m = merchant(req.body.merchant); if (!m) return fail(res, 'Merchant tidak dikenal.'); const q = quote(p, m, req.body.items, req.body.method, clk); if (q.error) return fail(res, q.error); res.json({ ok: true, ...q, open: openAt(m, clk.day, clk.sec), hours: hoursTxt(m) }); });

  function makeOrder(v, m, q, method, txId, clk, idem) {
    const id = rid('or');
    let ready, eta;
    if (m.id === 'antarrasa') { const prep = Math.max(...q.lines.map(l => item(l.id).delivery.prep)), ride = Math.max(...q.lines.map(l => item(l.id).delivery.ride)); ready = clk.abs + prep * 60; eta = ready + ride * 60; }
    else { const h = crypto.createHash('sha1').update(idem).digest()[0] / 255, days = Math.max(...q.lines.map(l => { const s = item(l.id).ship; return s[0] + Math.round(h * (s[1] - s[0])); })); ready = clk.abs + 6 * 3600; eta = absOf(clk.day + days, 10 * 3600); }
    db.prepare('INSERT INTO fin_orders (id, visitor, merchant, items, total, method, tx_id, placed_abs, ready_abs, eta_abs, status, created) VALUES (?,?,?,?,?,?,?,?,?,?,?,?)').run(id, v, m.id, JSON.stringify(q.lines), q.total, method, txId, clk.abs, ready, eta, 'aktif', now());
    return { id, readyAbs: ready, etaAbs: eta };
  }

  app.post('/api/fin/order/receive', guard((req, res) => {
    const p = need(req, res); if (!p) return; const v = p.visitor, clk = clockOf(req, p); if (clk.error) return fail(res, clk.error);
    const o = db.prepare('SELECT * FROM fin_orders WHERE visitor=? AND id=?').get(v, req.body.order); if (!o) return fail(res, 'Pesanan tidak ditemukan.');
    if (o.status === 'diterima') return res.json({ ...view(p, clk.abs), duplicate: true, items: JSON.parse(o.items), msg: 'Pesanan sudah diterima.' });
    const s = orderStatus(o, clk.abs); if (s !== 'tiba') return fail(res, `Pesanan masih ${s}.`);
    let out;
    dbTx(() => {
      const t = txRow(o.tx_id); let adj = null;
      if (o.method === 'cod') {
        if (cashOf(p) < o.total) { db.prepare("UPDATE fin_tx SET status='gagal', reason=? WHERE id=?").run(`Uang tunai kurang saat pesanan tiba (${fmt(cashOf(p))})`, t.id); db.prepare("UPDATE fin_orders SET status='gagal' WHERE id=?").run(o.id); out = { ...view(p, clk.abs), ok: false, error: `Uang tunai tidak cukup (${fmt(cashOf(p))}). Kurir membawa kembali pesanan.` }; return; }
        adj = cashApply(p, -o.total, merchant(o.merchant).cat === 'antar' ? 'makan' : 'belanja', `COD ${merchant(o.merchant).name}`, t.id);
        db.prepare("UPDATE fin_tx SET status='berhasil', reason=NULL, day=?, sec=? WHERE id=?").run(clk.day, clk.sec, t.id);
      }
      db.prepare("UPDATE fin_orders SET status='diterima' WHERE id=?").run(o.id);
      out = { ...view(p, clk.abs), items: JSON.parse(o.items), msg: `Pesanan ${merchant(o.merchant).name} diterima.`, cashAdj: adj ? [adj] : [] };
    })();
    res.status(out.ok === false ? 402 : 200).json(out);
  }));

  app.post('/api/fin/order/cancel', guard((req, res) => {
    const p = need(req, res); if (!p) return; const v = p.visitor, clk = clockOf(req, p); if (clk.error) return fail(res, clk.error);
    const o = db.prepare('SELECT * FROM fin_orders WHERE visitor=? AND id=?').get(v, req.body.order); if (!o) return fail(res, 'Pesanan tidak ditemukan.');
    const s = orderStatus(o, clk.abs); if (s !== 'diproses') return fail(res, `Pesanan sudah ${s} — tidak bisa dibatalkan.`);
    let out;
    dbTx(() => {
      const t = txRow(o.tx_id); let adj = null;
      db.prepare("UPDATE fin_orders SET status='dibatalkan' WHERE id=?").run(o.id);
      if (t.status === 'pending') db.prepare("UPDATE fin_tx SET status='gagal', reason='Dibatalkan pembeli sebelum diproses' WHERE id=?").run(t.id);
      else if (t.status === 'berhasil') {
        const amount = -t.amount, src = t.src === 'cash' ? { type: 'cash' } : { type: 'acct', acct: acct(v, t.src) };
        db.prepare("UPDATE fin_tx SET status='reversed' WHERE id=?").run(t.id);
        const rt = addTx(v, { kind: 'reversal', status: 'berhasil', amount, method: t.method, dst: t.src, merchant: t.merchant, label: `Pengembalian dana: ${t.label}`, reversal_of: t.id, day: clk.day, sec: clk.sec });
        adj = refund(p, src, amount, 'refund', 'Pengembalian dana pesanan', rt);
      }
      out = { ...view(p, clk.abs), msg: t.status === 'pending' ? 'Pesanan COD dibatalkan. Tidak ada uang yang berpindah.' : `Pesanan dibatalkan. Dana ${fmt(-t.amount)} dikembalikan ke sumber pembayaran.`, cashAdj: adj ? [adj] : [] };
    })();
    res.json(out);
  }));

  // ——— transfer, top-up, setor/tarik tunai ———
  app.post('/api/fin/transfer', guard((req, res) => {
    const p = need(req, res); if (!p) return; const b = req.body || {}, v = p.visitor;
    if (!idemOk(b.idem)) return fail(res, 'Kunci transaksi tidak valid.'); const dup = findIdem(v, b.idem); if (dup) return res.json({ ...dup, duplicate: true });
    const clk = clockOf(req, p); if (clk.error) return fail(res, clk.error);
    const amount = Math.floor(Number(b.amount) || 0); if (amount < 10_000) return fail(res, 'Nominal minimal Rp 10.000.');
    const from = b.from === 'cash' ? null : acct(v, b.from), to = b.to === 'cash' ? null : acct(v, b.to);
    if ((b.from !== 'cash' && !from) || (b.to !== 'cash' && !to)) return fail(res, 'Akun tidak ditemukan.');
    if (b.from === b.to) return fail(res, 'Sumber dan tujuan sama.');
    if ((from && from.status !== 'aktif') || (to && to.status !== 'aktif')) return fail(res, 'Akun tidak aktif.');
    if (from?.kind === 'credit' || to?.kind === 'credit') return fail(res, 'Gunakan menu Tagihan Kartu Kredit untuk membayar kartu. Tarik tunai kartu kredit tidak tersedia.');
    let fee = 0, kind, label, channel = null, needPin = true;
    const fk = from ? from.kind : 'cash', tk = to ? to.kind : 'cash';
    if (fk === 'cash' && tk === 'bank') {
      const bk = bank(to.provider); kind = 'setor'; needPin = false;
      if (tellerOpen(bk, clk.day, clk.sec)) channel = 'teller'; else if (bk.cashDepositAtm) channel = 'ATM setor tunai'; else if (bk.id === 'sakti') { channel = 'SerbaMart 24'; fee = 2_000; }
      else return fail(res, `Setor tunai ${bk.short} hanya lewat teller, Senin–Jumat ${bk.teller.from}:00–${bk.teller.to}:00.`);
      label = `Setor tunai ke ${bk.short} (${channel})`;
    } else if (fk === 'bank' && tk === 'cash') {
      const bk = bank(from.provider), c = cardOf(v, from.id); kind = 'tarik';
      if (!c || c.status !== 'aktif') return fail(res, 'Tarik tunai di ATM butuh kartu debit aktif.');
      if (amount % 50_000) return fail(res, 'ATM hanya mengeluarkan kelipatan Rp 50.000.');
      if (use(from, clk.day, 'withdraw') + amount > bk.dailyWithdraw) return fail(res, `Melebihi limit tarik tunai harian ${fmt(bk.dailyWithdraw)}.`);
      fee = bk.atmFeeOther; channel = bk.atmFeeOther ? 'ATM jaringan' : `ATM ${bk.short}`; label = `Tarik tunai ${bk.short} (${channel})`;
    } else if (fk === 'bank' && tk === 'bank') {
      const bk = bank(from.provider); kind = 'transfer';
      if (use(from, clk.day, 'transfer') + amount > bk.dailyTransfer) return fail(res, `Melebihi limit transfer harian ${fmt(bk.dailyTransfer)}.`);
      fee = from.provider === to.provider ? 0 : monthTransfers(from, clk.day) < bk.freeTransfers ? 0 : bk.transferFee; label = `Transfer ${bk.short} → ${bank(to.provider).short}`;
    } else if (fk === 'bank' && tk === 'wallet') {
      const w = wallet(to.provider); kind = 'topup'; fee = w.topupBankFee; label = `Top up ${w.name} dari ${bank(from.provider).short}`;
      if (to.balance + amount > walletMax(to)) return fail(res, `Saldo ${w.name} maksimal ${fmt(walletMax(to))}${to.meta.verified ? '' : ' (akun basic — verifikasi untuk menaikkan)'}.`);
    } else if (fk === 'cash' && tk === 'wallet') {
      const w = wallet(to.provider); kind = 'topup'; fee = w.topupCashFee; needPin = false; channel = 'SerbaMart 24'; label = `Top up ${w.name} tunai di kasir SerbaMart`;
      if (to.balance + amount > walletMax(to)) return fail(res, `Saldo ${w.name} maksimal ${fmt(walletMax(to))}.`);
    } else if (fk === 'wallet' && tk === 'bank') {
      const w = wallet(from.provider); kind = 'tarik_saldo'; fee = w.withdrawFee; label = `Tarik saldo ${w.name} ke ${bank(to.provider).short}`;
      if (w.withdrawNeedsVerified && !from.meta.verified) return fail(res, `${w.name} basic tidak bisa tarik saldo ke bank. Verifikasi akun dulu.`);
    } else return fail(res, 'Kombinasi transfer ini tidak didukung (mis. antar dompet digital).');
    if (needPin) { const pe = checkPin(v, b.pin); if (pe) return fail(res, pe); }
    const total = amount + fee;
    let out;
    dbTx(() => {
      const src = from ? { type: 'acct', acct: from } : { type: 'cash' };
      const err = debitSource(p, src, total, clk, kind);
      if (err) { const tx = addTx(v, { idem: b.idem, kind, status: 'gagal', amount: -total, fee, method: channel || 'transfer', src: b.from, dst: b.to, label, reason: err, day: clk.day, sec: clk.sec }); out = { ...view(p), ok: false, error: err, txn: txRow(tx), cashAdj: [] }; setResp(tx, out); return; }
      const tx = addTx(v, { idem: b.idem, kind, status: 'berhasil', amount, fee, method: channel || 'transfer', src: b.from, dst: b.to, label, day: clk.day, sec: clk.sec });
      const adj = [];
      if (from) { from.balance -= total; if (kind === 'tarik') addUse(from, clk.day, 'withdraw', amount); if (kind === 'transfer') { addUse(from, clk.day, 'transfer', amount); if (from.provider !== to.provider) addMonthTransfer(from, clk.day); } putAcct(from); }
      else adj.push(cashApply(p, -total, kind === 'setor' ? 'tabungan_bank' : 'topup_dompet', label, tx));
      if (to) { const t2 = acct(v, to.id); t2.balance += amount; putAcct(t2); } else adj.push(cashApply(p, amount, 'tarik_tunai', label, tx));
      out = { ...view(p), txn: txRow(tx), msg: `${label}: ${fmt(amount)} berhasil${fee ? ` (biaya ${fmt(fee)})` : ''}.`, cashAdj: adj }; setResp(tx, out);
    })();
    res.status(out.ok === false ? 402 : 200).json(out);
  }));

  app.post('/api/fin/credit/pay', guard((req, res) => {
    const p = need(req, res); if (!p) return; const b = req.body || {}, v = p.visitor;
    if (!idemOk(b.idem)) return fail(res, 'Kunci transaksi tidak valid.'); const dup = findIdem(v, b.idem); if (dup) return res.json({ ...dup, duplicate: true });
    const clk = clockOf(req, p); if (clk.error) return fail(res, clk.error);
    const card = acct(v, b.card); if (!card || card.kind !== 'credit') return fail(res, 'Kartu kredit tidak ditemukan.');
    const from = acct(v, b.from); if (!from || from.kind !== 'bank') return fail(res, 'Bayar tagihan dari rekening bank.');
    const amount = Math.floor(Number(b.amount) || 0); if (amount < 10_000) return fail(res, 'Nominal minimal Rp 10.000.');
    if (amount > card.balance) return fail(res, `Melebihi tagihan berjalan ${fmt(card.balance)}.`);
    const pe = checkPin(v, b.pin); if (pe) return fail(res, pe);
    let out;
    dbTx(() => {
      if (from.balance < amount) { const tx = addTx(v, { idem: b.idem, kind: 'bayar_kartu', status: 'gagal', amount: -amount, method: 'transfer', src: from.id, dst: card.id, label: `Bayar kartu kredit dari ${bank(from.provider).short}`, reason: `Saldo ${fmt(from.balance)} tidak cukup`, day: clk.day, sec: clk.sec }); out = { ...view(p), ok: false, error: `Saldo ${bank(from.provider).short} tidak cukup.`, txn: txRow(tx) }; setResp(tx, out); return; }
      from.balance -= amount; putAcct(from); card.balance -= amount; putAcct(card);
      let left = amount;
      for (const sm of db.prepare("SELECT * FROM fin_statements WHERE account_id=? AND status='terbuka' ORDER BY stmt_day").all(card.id)) { const k = Math.min(left, sm.amount - sm.paid); if (k <= 0) continue; db.prepare('UPDATE fin_statements SET paid=paid+? WHERE id=?').run(k, sm.id); left -= k; }
      const tx = addTx(v, { idem: b.idem, kind: 'bayar_kartu', status: 'berhasil', amount: -amount, method: 'transfer', src: from.id, dst: card.id, label: `Bayar kartu kredit ${product(card.provider).name} dari ${bank(from.provider).short}`, day: clk.day, sec: clk.sec });
      out = { ...view(p), txn: txRow(tx), msg: `Pembayaran kartu ${fmt(amount)} berhasil. Sisa tagihan ${fmt(card.balance)}.` }; setResp(tx, out);
    })();
    res.status(out.ok === false ? 402 : 200).json(out);
  }));

  // Gaji ke rekening (dikirim engine klien lewat antrean; idempoten per hari gaji).
  app.post('/api/fin/inbound', guard((req, res) => {
    const p = need(req, res); if (!p) return; const b = req.body || {}, v = p.visitor;
    if (!idemOk(b.idem)) return fail(res, 'Kunci transaksi tidak valid.'); const dup = findIdem(v, b.idem); if (dup) return res.json({ ...dup, duplicate: true });
    const clk = clockOf(req, p); if (clk.error) return fail(res, clk.error);
    const a = acct(v, b.account); const amount = Math.floor(Number(b.amount) || 0);
    if (!a || a.kind !== 'bank' || a.status !== 'aktif') return fail(res, 'Rekening gaji tidak aktif.');
    if (amount <= 0 || amount > 100_000_000) return fail(res, 'Nominal gaji tidak valid.');
    let out;
    dbTx(() => { a.balance += amount; putAcct(a); const tx = addTx(v, { idem: b.idem, kind: 'gaji', status: 'berhasil', amount, method: 'transfer masuk', dst: a.id, label: String(b.label || 'Gaji').slice(0, 80), day: clk.day, sec: clk.sec }); out = { ...view(p), txn: txRow(tx), msg: `Gaji ${fmt(amount)} masuk ke ${bank(a.provider).short}.` }; setResp(tx, out); })();
    res.json(out);
  }));

  // Dipanggil server.cjs: PUT /api/game ditolak bila save tidak memuat penyesuaian tunai terbaru.
  return {
    migrate,
    // Pembantu keuangan untuk modul commerce (satu sumber kebenaran untuk saldo, limit, PIN, dan buku transaksi).
    core: { resolveMethod, debitSource, applyDebit, refund, checkPin, addTx, setResp, txRow, view, idemOk, findIdem, acct, absOf, openAt, hoursTxt, cashOf, cashApply, guard, st, advance, SEC_DAY, nameOf, fmt },
    checkSeq(visitor, game) {
      const row = db.prepare('SELECT fin_seq FROM players WHERE visitor=?').get(visitor) || {};
      const need = row.fin_seq || 0, have = Number(game.finSeq) || 0;
      if (have >= need) return null;
      return db.prepare('SELECT seq, delta, cat, label FROM fin_cash_log WHERE visitor=? AND seq>? ORDER BY seq').all(visitor, have);
    },
    reset(visitor) { for (const t of ['fin_accounts', 'fin_cards', 'fin_tx', 'fin_statements', 'fin_orders', 'fin_cash_log', 'fin_state']) db.prepare(`DELETE FROM ${t} WHERE visitor=?`).run(visitor); db.prepare('UPDATE players SET fin_seq=0 WHERE visitor=?').run(visitor); },
  };
};
