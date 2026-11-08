// SOCIAL LIFE & RELATIONSHIP — kontak, social graph, kepribadian + memori NPC, chat dua arah, transfer antarindividu lewat ledger Keuangan,
// permintaan uang, pinjaman/cicilan/janji, bantuan non-finansial, reputasi sosial, dan otonomi NPC.
// Prinsip: tanpa Math.random (semua hash id+hari → server/klien/tes sepaham), uang hanya lewat FINANCE.core (debit/kredit/ledger yang sama),
// teks chat TIDAK menjadi bukti transaksi (status diambil dari fin_tx), memori & riwayat dibatasi agar efisien, cooldown + batas pesan/hari.
const M = require('./market-catalog.cjs');
const { hf } = M;
const DAY = 86400, WARM = 14, MAX_MEM = 12, MAX_MSG = 400;
const clamp = (x, a, b) => Math.max(a, Math.min(b, x));
const parse = (t, d = null) => { if (t == null || t === '') return d; try { return JSON.parse(t); } catch { return d; } };
const fmtRp = n => 'Rp ' + Math.round(n).toLocaleString('id-ID');
const dayOf = abs => Math.floor(abs / DAY) - WARM;
const BAD = /\b(anjing|bangsat|babi|goblok|tolol|bodoh|kontol|memek|brengsek|sialan|bajingan|asu|tai|jancok|kampret)\b/i, THREAT = /\b(bunuh|hajar kau|awas kau|kuhabisi|ku habisi|kuhancurkan|pecat kau)\b/i, HARASS = /\b(telanjang|seksi banget|kirim foto pribadi|vcs)\b/i;
const FIRST = ['Adi', 'Bayu', 'Citra', 'Dewi', 'Eko', 'Fitri', 'Gita', 'Hadi', 'Indra', 'Joko', 'Kiki', 'Lina', 'Mira', 'Nanda', 'Oki', 'Putri', 'Rani', 'Sari', 'Tono', 'Umar', 'Vina', 'Wawan', 'Yuni', 'Zaki', 'Rizky', 'Anisa', 'Dimas', 'Salsa', 'Farhan', 'Nabila', 'Galih', 'Ayu'];
const LAST = ['Santoso', 'Wijaya', 'Lestari', 'Pratama', 'Hidayat', 'Kusuma', 'Saputra', 'Rahayu', 'Nugroho', 'Permata', 'Setiawan', 'Maharani', 'Fauzi', 'Utami'];

// ——— kepribadian: talk = frekuensi menghubungi, gen = kedermawanan, caution = kehati-hatian soal uang, soft = pemaaf (reaksi atas penolakan/telat) ———
const PERS = {
  ramah: { label: 'Ramah dan mudah bergaul', talk: 1.3, gen: .55, caution: .4, soft: .7, voice: 'warm' },
  pendiam: { label: 'Pendiam', talk: .55, gen: .45, caution: .6, soft: .5, voice: 'reserved' },
  ambisius: { label: 'Ambisius', talk: .9, gen: .35, caution: .5, soft: .4, voice: 'formal' },
  hemat: { label: 'Hemat', talk: .8, gen: .2, caution: .8, soft: .5, voice: 'reserved' },
  dermawan: { label: 'Dermawan', talk: 1, gen: .85, caution: .3, soft: .8, voice: 'warm' },
  hati_hati: { label: 'Hati-hati dalam urusan uang', talk: .8, gen: .3, caution: .95, soft: .5, voice: 'reserved' },
  mudah_percaya: { label: 'Mudah percaya', talk: 1, gen: .7, caution: .15, soft: .7, voice: 'warm' },
  mandiri: { label: 'Mandiri', talk: .7, gen: .4, caution: .6, soft: .45, voice: 'reserved' },
  penolong: { label: 'Suka membantu', talk: 1.1, gen: .75, caution: .4, soft: .8, voice: 'warm' },
  mudah_kecewa: { label: 'Mudah merasa kecewa', talk: .9, gen: .45, caution: .6, soft: .2, voice: 'touchy' },
  profesional: { label: 'Profesional', talk: .75, gen: .4, caution: .7, soft: .5, voice: 'formal' },
  humoris: { label: 'Suka bercanda secara sopan', talk: 1.2, gen: .5, caution: .4, soft: .65, voice: 'warm' },
};
const PKEYS = Object.keys(PERS);
const CATS = { stranger: 'Orang asing', acquaintance: 'Kenalan', friend: 'Teman', close_friend: 'Teman dekat', best_friend: 'Sahabat', family: 'Keluarga', coworker: 'Rekan kerja', classmate: 'Teman sekelas', internship: 'Rekan magang', business: 'Rekan bisnis', mentor: 'Mentor', romantic: 'Pasangan', estranged: 'Hubungan renggang' };
const STATES = ['neutral', 'friendly', 'concerned', 'request_pending', 'negotiation', 'promise_made', 'conflict', 'reconciliation', 'completed'];
const STATE_LABEL = { neutral: 'Biasa', friendly: 'Hangat', concerned: 'Peduli', request_pending: 'Menunggu permintaan', negotiation: 'Negosiasi', promise_made: 'Ada janji', conflict: 'Ada ganjalan', reconciliation: 'Berdamai', completed: 'Selesai' };
const REQ_TYPES = { darurat: 'Bantuan darurat', pinjam: 'Pinjaman sementara', bayar_utang: 'Pembayaran kembali utang', bagi_biaya: 'Berbagi biaya kegiatan', sekolah: 'Bantuan biaya sekolah', transport: 'Bantuan transportasi', kebutuhan: 'Kebutuhan sehari-hari', kontribusi: 'Kontribusi kegiatan sosial', modal: 'Modal kerja / usaha' };
const REQ_STATUS = { pending: 'Menunggu', accepted: 'Disetujui', partial: 'Disetujui sebagian', declined: 'Ditolak', expired: 'Kedaluwarsa', completed: 'Selesai', cancelled: 'Dibatalkan' };
const HELP = {
  belajar: { label: 'Membantu belajar', min: 120, cost: 0, skill: 'edu' },
  temani: { label: 'Menemani', min: 90, cost: 0 },
  lowongan: { label: 'Membagikan info lowongan', min: 20, cost: 0 },
  wawancara: { label: 'Membantu persiapan wawancara', min: 90, cost: 0, skill: 'komunikasi' },
  saran: { label: 'Memberi saran', min: 30, cost: 0 },
  antar: { label: 'Mengantar', min: 60, cost: 15000 },
  pinjam_barang: { label: 'Meminjamkan barang', min: 15, cost: 0 },
  hubungkan: { label: 'Menghubungkan kontak peluang kerja', min: 30, cost: 0 },
  promosi: { label: 'Membantu promosi konten/bisnis', min: 45, cost: 0 },
};
const MAX_XFER = 10_000_000, MAX_DAY = 25_000_000, FEE_BANK = 2500;
const T = (arr, h) => arr[Math.floor(h * arr.length) % arr.length];

module.exports = function mountRelation(app, H, F, CM, SL) {
  const { db, tx: dbTx, vid, rid, fail, getPlayer, ageAt } = H;
  const { debitSource, applyDebit, checkPin, addTx, setResp, view: finView, idemOk, findIdem, creditIn, guard } = F;
  const X = SL.X;
  const SCHEMA = `
  CREATE TABLE IF NOT EXISTS rl_state (visitor TEXT PRIMARY KEY, seeded INTEGER DEFAULT 0, last_day INTEGER DEFAULT 0, kept INTEGER DEFAULT 0, broken INTEGER DEFAULT 0, job_seed TEXT);
  CREATE TABLE IF NOT EXISTS rl_contacts (visitor TEXT, id TEXT, name TEXT, cat TEXT, age INTEGER, job TEXT, pers TEXT, interests TEXT, goal TEXT, income INTEGER, bal INTEGER, trust REAL, close REAL, rep REAL, mood REAL, met_day INTEGER, n_int INTEGER DEFAULT 0, last_npc_abs INTEGER DEFAULT 0, last_me_abs INTEGER DEFAULT 0, kind TEXT, need TEXT, PRIMARY KEY (visitor, id));
  CREATE TABLE IF NOT EXISTS rl_edges (visitor TEXT, a TEXT, b TEXT, type TEXT, PRIMARY KEY (visitor, a, b));
  CREATE TABLE IF NOT EXISTS rl_threads (visitor TEXT, contact TEXT, state TEXT DEFAULT 'neutral', ctx TEXT, ctx_ref TEXT, last_abs INTEGER DEFAULT 0, PRIMARY KEY (visitor, contact));
  CREATE TABLE IF NOT EXISTS rl_msgs (id INTEGER PRIMARY KEY AUTOINCREMENT, visitor TEXT, contact TEXT, who TEXT, text TEXT, abs INTEGER, kind TEXT, ref TEXT, notified INTEGER DEFAULT 0, idem TEXT);
  CREATE TABLE IF NOT EXISTS rl_mem (id INTEGER PRIMARY KEY AUTOINCREMENT, visitor TEXT, contact TEXT, kind TEXT, text TEXT, abs INTEGER, w INTEGER DEFAULT 1);
  CREATE TABLE IF NOT EXISTS rl_req (id TEXT PRIMARY KEY, visitor TEXT, contact TEXT, dir TEXT, type TEXT, amount INTEGER, reason TEXT, urgency INTEGER, due_abs INTEGER, status TEXT, tx TEXT, loan TEXT, created_abs INTEGER, resolve_abs INTEGER, meta TEXT, ext INTEGER DEFAULT 0);
  CREATE TABLE IF NOT EXISTS rl_loans (id TEXT PRIMARY KEY, visitor TEXT, contact TEXT, dir TEXT, principal INTEGER, total INTEGER, interest REAL, due_day INTEGER, created_day INTEGER, paid INTEGER DEFAULT 0, status TEXT, installments INTEGER DEFAULT 1, recv TEXT, note TEXT, late_steps INTEGER DEFAULT 0);
  CREATE TABLE IF NOT EXISTS rl_prom (id TEXT PRIMARY KEY, visitor TEXT, contact TEXT, text TEXT, due_day INTEGER, status TEXT, created_abs INTEGER, loan TEXT);
  CREATE TABLE IF NOT EXISTS rl_ev (visitor TEXT, key TEXT, abs INTEGER, n INTEGER DEFAULT 0, PRIMARY KEY (visitor, key));
  CREATE TABLE IF NOT EXISTS rl_xfer (id TEXT PRIMARY KEY, visitor TEXT, contact TEXT, kind TEXT, amount INTEGER, fee INTEGER, tx TEXT, day INTEGER, abs INTEGER, note TEXT, req TEXT, loan TEXT, dir TEXT);`;
  const TABLES = ['rl_state', 'rl_contacts', 'rl_edges', 'rl_threads', 'rl_msgs', 'rl_mem', 'rl_req', 'rl_loans', 'rl_prom', 'rl_ev', 'rl_xfer'];
  function migrate() {
    db.exec(SCHEMA);
    for (const ix of ['CREATE INDEX IF NOT EXISTS ix_rl_msgs ON rl_msgs (visitor, contact, id)', 'CREATE INDEX IF NOT EXISTS ix_rl_req ON rl_req (visitor, status)', 'CREATE INDEX IF NOT EXISTS ix_rl_loans ON rl_loans (visitor, status)', 'CREATE INDEX IF NOT EXISTS ix_rl_mem ON rl_mem (visitor, contact)', 'CREATE INDEX IF NOT EXISTS ix_rl_xfer ON rl_xfer (visitor, day)']) { try { db.exec(ix); } catch { /* indeks opsional */ } }
  }
  const reset = v => { for (const t of TABLES) db.prepare(`DELETE FROM ${t} WHERE visitor=?`).run(v); };

  // ————————————————————————— bantu umum —————————————————————————
  const bad = (m, code = 400) => { throw Object.assign(new Error(), { user: m, code }); };
  const need = (req, res) => { const p = getPlayer(vid(req)); if (!p || !p.profile || !p.game) { fail(res, 'Profil atau save game belum ada.', 404); return null; } return p; };
  const clkOf = (req, p) => { const c = req.method === 'GET' ? { day: req.query.day, sec: req.query.sec } : (req.body?.clock || {}); return CM.absOfClock(p, c.day, c.sec); };
  const wrap = fn => (req, res) => { try { const p = need(req, res); if (!p) return; const clk = clkOf(req, p); if (clk.error) return fail(res, clk.error); const v = p.visitor; let out; dbTx(() => { tick(p, clk); out = fn({ p, v, clk, req, res }); })(); if (out !== undefined && !res.headersSent) res.json(out); } catch (e) { if (e.user) return fail(res, e.user, e.code && e.code < 600 ? e.code : 400); console.error('[relation]', e); fail(res, 'Kesalahan server modul sosial.', 500); } };
  const str = (x, n) => String(x ?? '').replace(/[\u0000-\u001f<>]/g, ' ').trim().slice(0, n);
  const intIn = (x, a, b) => { const n = Math.floor(Number(x)); return Number.isFinite(n) && n >= a && n <= b ? n : null; };
  const contactOf = (v, id) => { const c = db.prepare('SELECT * FROM rl_contacts WHERE visitor=? AND id=?').get(v, String(id || '')); if (!c) bad('Kontak tidak ditemukan.', 404); return c; };
  const thread = (v, cid) => { let t = db.prepare('SELECT * FROM rl_threads WHERE visitor=? AND contact=?').get(v, cid); if (!t) { db.prepare('INSERT INTO rl_threads (visitor, contact) VALUES (?,?)').run(v, cid); t = db.prepare('SELECT * FROM rl_threads WHERE visitor=? AND contact=?').get(v, cid); } return t; };
  const evGet = (v, k) => db.prepare('SELECT abs, n FROM rl_ev WHERE visitor=? AND key=?').get(v, k);
  const evSet = (v, k, abs, n = 0) => db.prepare('INSERT INTO rl_ev (visitor, key, abs, n) VALUES (?,?,?,?) ON CONFLICT(visitor, key) DO UPDATE SET abs=excluded.abs, n=excluded.n').run(v, k, Math.round(abs), n);
  const cooled = (v, k, abs, days) => { const e = evGet(v, k); return !e || abs - e.abs >= days * DAY; };
  const addMsg = (v, cid, who, text, abs, kind = 'text', ref = null, idem = null) => db.prepare('INSERT INTO rl_msgs (visitor, contact, who, text, abs, kind, ref, idem) VALUES (?,?,?,?,?,?,?,?)').run(v, cid, who, text, Math.round(abs), kind, ref ? JSON.stringify(ref) : null, idem);
  const mem = (v, cid, kind, text, abs, w = 1) => {
    db.prepare('INSERT INTO rl_mem (visitor, contact, kind, text, abs, w) VALUES (?,?,?,?,?,?)').run(v, cid, kind, text, Math.round(abs), w);
    const n = db.prepare('SELECT COUNT(*) AS n FROM rl_mem WHERE visitor=? AND contact=?').get(v, cid).n;
    if (n > MAX_MEM) db.prepare('DELETE FROM rl_mem WHERE id IN (SELECT id FROM rl_mem WHERE visitor=? AND contact=? ORDER BY w ASC, id ASC LIMIT ?)').run(v, cid, n - MAX_MEM); // memori terukur: buang yang paling tidak penting/lama
  };
  const setThread = (v, cid, state, ctx, ref, abs) => db.prepare('UPDATE rl_threads SET state=?, ctx=?, ctx_ref=?, last_abs=MAX(last_abs, ?) WHERE visitor=? AND contact=?').run(state, ctx || null, ref || null, Math.round(abs), v, cid);
  const P = c => PERS[c.pers] || PERS.ramah;
  const vo = c => P(c).voice;
  const say = (c, tag, h = 0.5, vars = {}) => { const set = TXT[tag] || TXT.generic; const arr = set[vo(c)] || set.warm || set.any; let s = T(arr, h); for (const [k, x] of Object.entries(vars)) s = s.split('{' + k + '}').join(x); return s; };
  // Perubahan hubungan (kepercayaan, kedekatan, suasana hati) + kategori dapat berkembang hanya dari pola interaksi.
  function bump(v, c, d, abs) {
    const t = clamp(c.trust + (d.trust || 0), 0, 100), cl = clamp(c.close + (d.close || 0), 0, 100), mo = clamp(c.mood + (d.mood || 0), 0, 100);
    db.prepare('UPDATE rl_contacts SET trust=?, close=?, mood=? WHERE visitor=? AND id=?').run(t, cl, mo, v, c.id); c.trust = t; c.close = cl; c.mood = mo; reclass(v, c, abs);
  }
  function reclass(v, c, abs) {
    if (['family', 'coworker', 'internship', 'mentor', 'business', 'romantic', 'classmate'].includes(c.cat) && !(c.trust < 12 && c.close < 12)) return;
    const age = dayOf(abs) - c.met_day; let to = c.cat;
    if (c.cat === 'estranged') { if (c.trust >= 45 && c.close >= 35) to = 'friend'; }
    else if (c.trust < 12 && c.close < 15 && c.n_int >= 4) to = 'estranged';
    else if (c.cat === 'stranger' && c.n_int >= 2) to = 'acquaintance';
    else if (c.cat === 'acquaintance' && c.close >= 40 && c.trust >= 40 && c.n_int >= 6 && age >= 10) to = 'friend';
    else if (c.cat === 'friend' && c.close >= 70 && c.trust >= 60 && c.n_int >= 14 && age >= 20) to = 'close_friend';
    else if (c.cat === 'close_friend' && c.close >= 88 && c.trust >= 80 && c.n_int >= 30 && age >= 60) to = 'best_friend';
    else if (c.cat === 'best_friend' && (c.close < 70 || c.trust < 60)) to = 'close_friend';
    else if (c.cat === 'close_friend' && (c.close < 50 || c.trust < 40)) to = 'friend';
    if (to !== c.cat) { db.prepare('UPDATE rl_contacts SET cat=? WHERE visitor=? AND id=?').run(to, v, c.id); mem(v, c.id, 'status', `Hubungan berubah: ${CATS[c.cat]} → ${CATS[to]}.`, abs, 3); c.cat = to; }
  }
  const fresh = (v, id) => db.prepare('SELECT * FROM rl_contacts WHERE visitor=? AND id=?').get(v, id);
  const repOf = v => { const s = db.prepare('SELECT kept, broken FROM rl_state WHERE visitor=?').get(v) || { kept: 0, broken: 0 }; const a = db.prepare("SELECT AVG(trust) AS t FROM rl_contacts WHERE visitor=? AND cat!='estranged'").get(v).t ?? 50; return { kept: s.kept, broken: s.broken, score: Math.round(clamp(50 + s.kept * 2 - s.broken * 4 + (a - 50) * 0.5, 0, 100)), avgTrust: Math.round(a) }; };

  // ————————————————————————— teks dialog (templat, bukan pemahaman bahasa alami) —————————————————————————
  const TXT = {
    generic: { warm: ['Oke, noted ya.', 'Siap, terima kasih sudah kabari.'], reserved: ['Oke.', 'Baik, noted.'], formal: ['Baik, terima kasih atas informasinya.'], touchy: ['Iya.', 'Oke, noted.'] },
    sapa: { warm: ['Halo {p}! Lagi apa nih? Udah lama ngga ngobrol.', 'Hai {p}, apa kabar? Semoga harimu lancar ya.'], reserved: ['Halo {p}. Apa kabar?', 'Hai. Lagi sibuk?'], formal: ['Selamat {t}, {p}. Semoga sehat selalu.'], touchy: ['Hai {p}. Akhirnya ingat aku juga.'] },
    balas_sapa: { warm: ['Hai juga! Senang kamu menyapa duluan.', 'Halo! Aku baik, kamu gimana?'], reserved: ['Halo. Baik.', 'Hai, aku baik.'], formal: ['Halo, kabar saya baik. Terima kasih sudah menyapa.'], touchy: ['Oh, hai. Iya, baik.'] },
    kabar_reply: { warm: ['Alhamdulillah baik. Lagi sibuk {goal}. Kamu sendiri gimana?', 'Baik kok, lagi fokus {goal}. Kamu apa kabar?'], reserved: ['Baik. Lagi {goal}.', 'Biasa saja, lagi {goal}.'], formal: ['Baik, saat ini saya fokus {goal}. Anda sendiri?'], touchy: ['Baik. Lagi {goal}, kamu?'] },
    meet_yes: { warm: ['Boleh banget! Kabari saja waktunya ya.', 'Ayo! Aku senang kalau bisa ketemu.'], reserved: ['Boleh. Atur saja waktunya.'], formal: ['Baik, mari atur jadwalnya.'], touchy: ['Boleh, kalau kamu benar-benar sempat.'] },
    meet_no: { warm: ['Wah, hari ini aku lagi padat. Minggu depan ya?', 'Maaf banget, lagi ada urusan. Lain kali ya!'], reserved: ['Maaf, belum bisa sekarang.'], formal: ['Maaf, jadwal saya sedang penuh.'], touchy: ['Lagi tidak bisa. Kabari lagi nanti saja.'] },
    study_yes: { warm: ['Mau banget, aku lagi butuh teman belajar!'], reserved: ['Boleh, ayo belajar bareng.'], formal: ['Baik, belajar bersama akan membantu.'], touchy: ['Boleh. Jangan batal di menit terakhir ya.'] },
    offer_thanks: { warm: ['Terima kasih ya, kamu baik banget. Nanti kukabari kalau perlu.', 'Makasih tawarannya! Aku catat.'], reserved: ['Terima kasih. Nanti kukabari.'], formal: ['Terima kasih atas tawarannya.'], touchy: ['Terima kasih. Semoga benar-benar bisa diandalkan.'] },
    offer_decline: { warm: ['Tidak apa-apa kok, makasih sudah menawarkan.'], reserved: ['Oke, tidak apa-apa.'], formal: ['Baik, terima kasih.'], touchy: ['Oh, oke. Tidak apa-apa.'] },
    listen: { warm: ['Makasih sudah mau dengar... sebenarnya aku lagi agak berat. Tapi cerita begini saja sudah lega.'], reserved: ['Terima kasih sudah mau mendengarkan.'], formal: ['Terima kasih, perhatian Anda berarti.'], touchy: ['Setidaknya ada yang mau dengar.'] },
    declined_help: { warm: ['Oh... oke, aku paham. Terima kasih sudah jujur.'], reserved: ['Oke, aku paham.'], formal: ['Baik, saya mengerti.'], touchy: ['Oh. Oke. Padahal aku berharap kamu bisa bantu.'] },
    thanks: { warm: ['Sama-sama! Kapan pun.', 'Dengan senang hati.'], reserved: ['Sama-sama.'], formal: ['Sama-sama.'], touchy: ['Iya, sama-sama.'] },
    sorry_ok: { warm: ['Sudah, tidak apa-apa. Aku juga minta maaf kalau ikut salah.', 'Makasih sudah minta maaf. Kita mulai lagi ya.'], reserved: ['Oke, aku terima.'], formal: ['Permintaan maaf diterima.'], touchy: ['Hmm... oke. Aku butuh waktu sedikit, tapi makasih sudah bilang.'] },
    sorry_cold: { warm: ['Aku masih agak kecewa, tapi terima kasih sudah bilang.'], reserved: ['Hmm.'], formal: ['Saya menghargai itu, tetapi belum sepenuhnya reda.'], touchy: ['Maaf saja belum cukup bagiku sekarang.'] },
    ask_amount: { warm: ['Kira-kira butuh {amt}. Itu untuk {why}.'], reserved: ['{amt}. Untuk {why}.'], formal: ['Kebutuhannya sekitar {amt} untuk {why}.'], touchy: ['{amt}, untuk {why}. Aku tidak akan minta kalau tidak mendesak.'] },
    ask_why: { warm: ['Untuk {why}. Aku janji kasih kabar kapan bisa kembalikan, paling lambat {due}.'], reserved: ['Untuk {why}. Bisa kuganti paling lambat {due}.'], formal: ['Untuk {why}. Pengembalian paling lambat {due}.'], touchy: ['Untuk {why}. Tenggatnya {due}, aku tidak akan lupa.'] },
    smaller_ok: { warm: ['Boleh deh, segitu juga sangat membantu.'], reserved: ['Boleh, segitu cukup.'], formal: ['Jumlah tersebut cukup membantu.'], touchy: ['Ya sudah, segitu juga lumayan.'] },
    wait_ok: { warm: ['Oke, aku tunggu kabarmu ya. Tapi jangan lama-lama.'], reserved: ['Oke. Kabari saja.'], formal: ['Baik, saya tunggu kabarnya.'], touchy: ['Oke. Aku tunggu, tapi jangan sampai kelewat.'] },
    refused: { warm: ['Tidak apa-apa, aku coba cari cara lain. Makasih sudah jawab jujur.'], reserved: ['Oke. Aku cari cara lain.'], formal: ['Baik, saya akan mencari alternatif.'], touchy: ['Oke... kuingat. Tapi tidak apa-apa.'] },
    extension_ok: { warm: ['Makasih banyak! Aku pasti tepati kali ini.'], reserved: ['Terima kasih. Kutepati.'], formal: ['Terima kasih atas kelonggarannya.'], touchy: ['Terima kasih. Aku tidak akan lupa kebaikanmu.'] },
    extension_no: { warm: ['Oh, oke. Aku usahakan secepatnya.'], reserved: ['Baik. Kuusahakan.'], formal: ['Baik, akan saya usahakan.'], touchy: ['Oke. Aku usahakan, meski berat.'] },
    keep: { warm: ['Asyik, makasih sudah datang! Seru banget.'], reserved: ['Terima kasih sudah datang.'], formal: ['Terima kasih atas kehadirannya.'], touchy: ['Makasih sudah menepati.'] },
  };
  const hello = c => ({ f: 'sapa' });

  // ————————————————————————— seeding kontak & social graph —————————————————————————
  const nameOf = (seed, i) => FIRST[Math.floor(hf(seed, i, 'fn') * FIRST.length)] + ' ' + LAST[Math.floor(hf(seed, i, 'ln') * LAST.length)];
  const JOBS = ['Karyawan toko', 'Guru honorer', 'Petani', 'Pedagang pasar', 'Teknisi', 'Perawat', 'Sopir', 'Karyawan pabrik', 'Pegawai kantor', 'Penjahit'];
  const GOALS = ['mencari kerja yang lebih baik', 'menabung untuk kuliah', 'membuka usaha kecil', 'mengejar nilai ujian', 'belajar skill baru', 'menabung untuk keluarga', 'mempersiapkan magang', 'merenovasi rumah'];
  const INTERESTS = ['musik', 'sepak bola', 'memasak', 'membaca', 'game', 'menggambar', 'fotografi', 'berkebun', 'otomotif', 'film'];
  function mkContact(v, i, o, abs) {
    const seed = v + ':' + i, pers = PKEYS[Math.floor(hf(seed, 'pers') * PKEYS.length)], id = 'rc-' + i;
    const income = o.income ?? Math.round((1_000_000 + hf(seed, 'inc') * 5_000_000) / 100_000) * 100_000;
    const bal = Math.round(income * (0.3 + hf(seed, 'bal') * 2.2) / 10_000) * 10_000;
    db.prepare('INSERT INTO rl_contacts (visitor, id, name, cat, age, job, pers, interests, goal, income, bal, trust, close, rep, mood, met_day, kind) VALUES (?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?)').run(v, id, o.name || nameOf(v, i), o.cat, o.age, o.job, pers,
      JSON.stringify([INTERESTS[Math.floor(hf(seed, 'i1') * 10)], INTERESTS[Math.floor(hf(seed, 'i2') * 10)]]), GOALS[Math.floor(hf(seed, 'goal') * GOALS.length)], income, bal, o.trust, o.close, Math.round(40 + hf(seed, 'rep') * 50), 55 + Math.round(hf(seed, 'mood') * 25), dayOf(abs), o.kind || o.cat);
    return id;
  }
  function seed(p, clk) {
    const v = p.visitor, a = ageAt(p.profile, clk.day), last = String(p.profile.name || '').trim().split(/\s+/).slice(-1)[0] || 'Santoso', ids = [];
    ids.push(mkContact(v, 1, { name: 'Ibu ' + FIRST[Math.floor(hf(v, 'mom') * FIRST.length)] + ' ' + last, cat: 'family', age: a + 25 + Math.floor(hf(v, 'ma') * 8), job: T(JOBS, hf(v, 'mj')), trust: 72, close: 68, kind: 'ibu' }, clk.abs));
    ids.push(mkContact(v, 2, { name: 'Bapak ' + FIRST[Math.floor(hf(v, 'dad') * FIRST.length)] + ' ' + last, cat: 'family', age: a + 27 + Math.floor(hf(v, 'da') * 9), job: T(JOBS, hf(v, 'dj')), trust: 70, close: 62, kind: 'bapak' }, clk.abs));
    if (hf(v, 'sib') > 0.35) ids.push(mkContact(v, 3, { name: FIRST[Math.floor(hf(v, 'sn') * FIRST.length)] + ' ' + last, cat: 'family', age: Math.max(5, a + Math.floor(hf(v, 'sa') * 7) - 3), job: a < 20 ? 'Pelajar' : 'Pegawai kantor', income: a < 20 ? 300_000 : undefined, trust: 66, close: 60, kind: 'saudara' }, clk.abs));
    const school = a < 24;
    for (let i = 0; i < 3; i++) ids.push(mkContact(v, 4 + i, { cat: school ? 'classmate' : 'friend', age: Math.max(6, a + Math.floor(hf(v, 'ca', i) * 3) - 1), job: school ? 'Pelajar' : T(JOBS, hf(v, 'cj', i)), income: school ? 200_000 + Math.round(hf(v, 'al', i) * 6) * 100_000 : undefined, trust: 38 + Math.round(hf(v, 'ct', i) * 8), close: 30 + Math.round(hf(v, 'cc', i) * 12) }, clk.abs));
    ids.push(mkContact(v, 7, { cat: 'friend', age: Math.max(6, a + Math.floor(hf(v, 'fa') * 3) - 1), job: school ? 'Pelajar' : T(JOBS, hf(v, 'fj')), income: school ? 300_000 : undefined, trust: 55, close: 52 }, clk.abs));
    ids.push(mkContact(v, 8, { cat: 'acquaintance', age: a + 8 + Math.floor(hf(v, 'na') * 18), job: T(JOBS, hf(v, 'nj')), trust: 28, close: 18, kind: 'tetangga' }, clk.abs));
    // social graph antar-NPC: keluarga, teman sekelas, teman bersama (deterministik)
    const rows = db.prepare('SELECT id, cat FROM rl_contacts WHERE visitor=?').all(v), ins = db.prepare('INSERT OR IGNORE INTO rl_edges (visitor, a, b, type) VALUES (?,?,?,?)');
    for (let i = 0; i < rows.length; i++) for (let j = i + 1; j < rows.length; j++) { const x = rows[i], y = rows[j]; let t = null;
      if (x.cat === 'family' && y.cat === 'family') t = 'keluarga'; else if (x.cat === 'classmate' && y.cat === 'classmate') t = 'teman sekelas'; else if (x.cat === 'acquaintance' || y.cat === 'acquaintance') t = x.cat === 'family' || y.cat === 'family' ? (hf(v, x.id, y.id) < 0.5 ? 'tetangga' : null) : null;
      else if (hf(v, x.id, y.id, 'e') < 0.35 && x.cat !== 'family' && y.cat !== 'family') t = 'teman';
      if (t) ins.run(v, x.id, y.id, t); }
    return ids;
  }
  // Kontak dinamis: rekan kerja dan mentor muncul setelah pemain benar-benar bekerja (data save game).
  function dynamicContacts(p, clk) {
    const v = p.visitor, job = p.game?.career?.job; if (!job) return;
    const key = 'job:' + job.jobId; if (evGet(v, key)) return; evSet(v, key, clk.abs);
    const n = db.prepare('SELECT COUNT(*) AS n FROM rl_contacts WHERE visitor=?').get(v).n, a = ageAt(p.profile, clk.day), intern = /magang|intern/i.test(String(job.jobId));
    const ids = [mkContact(v, n + 1, { cat: intern ? 'internship' : 'coworker', age: a + Math.floor(hf(v, key, 'a') * 8) - 2, job: 'Rekan kerja', trust: 36, close: 28 }, clk.abs), mkContact(v, n + 2, { cat: 'coworker', age: a + 3 + Math.floor(hf(v, key, 'b') * 10), job: 'Rekan kerja', trust: 34, close: 24 }, clk.abs), mkContact(v, n + 3, { cat: 'mentor', age: a + 12 + Math.floor(hf(v, key, 'c') * 15), job: 'Penyelia', trust: 42, close: 30, income: 7_000_000 }, clk.abs)];
    const ins = db.prepare('INSERT OR IGNORE INTO rl_edges (visitor, a, b, type) VALUES (?,?,?,?)'); ins.run(v, ids[0], ids[1], 'rekan kerja'); ins.run(v, ids[0], ids[2], 'atasan'); ins.run(v, ids[1], ids[2], 'atasan');
  }

  // ————————————————————————— jadwal & ketersediaan NPC —————————————————————————
  function avail(c, abs) {
    const d = dayOf(abs), hr = (abs % DAY) / 3600, dow = ((d % 7) + 7) % 7, weekday = dow < 5;
    if (hr < 6 || hr >= 22) return { ok: false, why: 'sedang tidur', until: 6 };
    const stud = c.job === 'Pelajar'; if (weekday && stud && hr >= 7 && hr < 15) return { ok: false, why: 'sedang di sekolah', until: 15 };
    if (weekday && !stud && c.cat !== 'family' && hr >= 8 && hr < 17) return { ok: false, why: 'sedang bekerja', until: 17 };
    if (hf(c.id, d, Math.floor(hr / 3), 'busy') < 0.1 * (2 - P(c).talk / 1.2)) return { ok: false, why: 'sedang sibuk', until: (Math.floor(hr / 3) + 1) * 3 };
    return { ok: true };
  }
  const replyAt = (c, abs) => { const a = avail(c, abs); if (a.ok) return abs + 40 + Math.floor(hf(c.id, abs, 'dly') * 200); const base = Math.floor(abs / DAY) * DAY + a.until * 3600; return Math.max(abs + 60, base + Math.floor(hf(c.id, abs, 'dly2') * 1800)); };
  const band = (c) => { const r = c.bal / Math.max(1, c.income / 30); return r < 4 ? 'tipis' : r < 25 ? 'cukup' : 'longgar'; };
  // Kemampuan NPC membantu: tidak pernah melebihi kondisi keuangannya, sisakan cadangan seminggu.
  const capacity = (c, trustF = 1) => Math.max(0, Math.floor((c.bal - c.income / 30 * 7) * (0.15 + 0.45 * P(c).gen) * trustF / 10_000) * 10_000);
  const dueText = d => `hari ke-${d + 1}`;

  // ————————————————————————— mesin tick (lazy, deterministik) —————————————————————————
  const MAX_CATCHUP = 40, DAILY_CAP = 3;
  const KIND_CD = { sapa: 4, makan: 9, belajar: 12, kabar: 14, kangen: 20, minta_uang: 14, tawar_kerja: 30, undangan: 20, tawar_bantu: 15, minta_bantu: 12 };
  function npcSay(p, c, ctx, text, abs, ref = null, state = null) {
    const v = p.visitor; thread(v, c.id); addMsg(v, c.id, 'npc', text, abs, ctx === 'info' ? 'text' : 'prompt', ref);
    db.prepare('UPDATE rl_contacts SET last_npc_abs=MAX(last_npc_abs, ?) WHERE visitor=? AND id=?').run(Math.round(abs), v, c.id);
    setThread(v, c.id, state || (ctx === 'minta_uang' ? 'request_pending' : ctx === 'kesulitan' ? 'concerned' : ctx === 'konflik' ? 'conflict' : 'friendly'), ctx === 'info' ? null : ctx, ref ? JSON.stringify(ref) : null, abs);
  }
  function tick(p, clk) {
    const v = p.visitor; let st = db.prepare('SELECT * FROM rl_state WHERE visitor=?').get(v);
    if (!st) { db.prepare('INSERT INTO rl_state (visitor) VALUES (?)').run(v); st = db.prepare('SELECT * FROM rl_state WHERE visitor=?').get(v); }
    if (!st.seeded) { seed(p, clk); db.prepare('UPDATE rl_state SET seeded=1, last_day=? WHERE visitor=?').run(clk.day - 1, v); st.last_day = clk.day - 1; }
    dynamicContacts(p, clk); resolveAsks(p, clk); expireIncoming(p, clk);
    const today = clk.day; if (st.last_day < today) {
      const from = Math.max(st.last_day + 1, today - MAX_CATCHUP + 1);
      for (let d = from; d <= today; d++) dayStep(p, d, clk);
      db.prepare('UPDATE rl_state SET last_day=? WHERE visitor=?').run(today, v);
    }
    notifyDue(p, clk);
  }
  function dayStep(p, d, clk) {
    const v = p.visitor, dayStart = (d + WARM) * DAY, contacts = db.prepare('SELECT * FROM rl_contacts WHERE visitor=? ORDER BY id').all(v); let sent = 0;
    for (const c0 of contacts) { const c = fresh(v, c0.id);
      // keuangan NPC sederhana: pemasukan harian − pengeluaran, kadang kejutan (memicu kebutuhan bantuan)
      const inc = c.income / 30, spend = inc * (0.8 + 0.35 * hf(c.id, d, 'sp')); let bal = Math.max(0, c.bal + inc - spend), need = parse(c.need);
      if (hf(v, c.id, d, 'shock') < 0.025 && !need) { const amt = Math.round(c.income * (0.25 + hf(c.id, d, 'sa') * 0.6) / 10_000) * 10_000; bal = Math.max(0, bal - amt * 0.6); need = { type: c.age < 19 ? 'sekolah' : T(['darurat', 'transport', 'kebutuhan', 'bagi_biaya'], hf(c.id, d, 'st')), amt: Math.max(50_000, amt), day: d }; }
      db.prepare('UPDATE rl_contacts SET bal=?, need=? WHERE visitor=? AND id=?').run(Math.round(bal), need ? JSON.stringify(need) : null, v, c.id);
    }
    // pinjaman: NPC membayar / meminta tunda; pengingat utang pemain
    for (const L of db.prepare("SELECT * FROM rl_loans WHERE visitor=? AND status='aktif'").all(v)) { const c = fresh(v, L.contact); if (!c) continue; const at = dayStart + 9 * 3600 + Math.floor(hf(L.id, d, 'h') * 6 * 3600); loanDay(p, L, c, d, at); }
    // otonomi NPC: pesan baru dengan cooldown + batas harian
    const order = contacts.map(c => c.id).sort((a, b) => hf(v, a, d, 'ord') - hf(v, b, d, 'ord'));
    for (const id of order) { if (sent >= DAILY_CAP) break; const c = fresh(v, id), at = dayStart + 7 * 3600 + Math.floor(hf(c.id, d, 'at') * 14 * 3600); if (at - c.last_npc_abs < 3 * DAY && c.last_npc_abs) continue;
      const p0 = 0.1 * P(c).talk * (0.4 + c.close / 100 * 0.9) * ({ stranger: .3, family: 1.2, estranged: .15 }[c.cat] || 1) * (c.trust < 15 ? 0.5 : 1);
      const first = d === clk0(p) && !c.last_npc_abs && c.cat === 'family' && c.kind === 'ibu';
      if (!first && hf(v, c.id, d, 'ev') >= p0) continue; if (avail(c, at).why === 'sedang tidur') continue;
      if (npcEvent(p, c, d, at, first)) sent++; }
  }
  const clk0 = p => dayOf(db.prepare('SELECT MIN(met_day) AS m FROM rl_contacts WHERE visitor=?').get(p.visitor).m + WARM * DAY);
  function weights(c, d, v) {
    const poor = band(c) === 'tipis', need = parse(c.need), w = {};
    w.sapa = 3; w.kabar = 1.5; w.makan = 1.2; if (c.job === 'Pelajar') w.belajar = 1.8; w.undangan = 0.8;
    if (c.close >= 30) w.tawar_bantu = 0.8 * P(c).gen; if (c.trust >= 40 && ['coworker', 'mentor', 'friend', 'close_friend', 'internship', 'business'].includes(c.cat)) w.tawar_kerja = 0.6 * (0.5 + repOf(v).score / 100);
    if (need && c.trust >= 25 && c.close >= 20) w.minta_uang = 6; else if (poor && c.trust >= 40) w.minta_uang = 0.5;
    if (c.cat !== 'estranged' && c.close >= 30) w.minta_bantu = 0.7;
    return w;
  }
  function npcEvent(p, c, d, at, first) {
    const v = p.visitor; let w = weights(c, d, v); if (first) w = { sapa: 1 };
    const pending = db.prepare("SELECT COUNT(*) AS n FROM rl_req WHERE visitor=? AND contact=? AND dir='in' AND status='pending'").get(v, c.id).n;
    const keys = Object.keys(w).filter(k => cooled(v, `k:${c.id}:${k}`, at, KIND_CD[k] || 5) && !(k === 'minta_uang' && pending) && !(k === 'minta_bantu' && pending)); if (!keys.length) return false;
    const tot = keys.reduce((s, k) => s + w[k], 0); let r = hf(v, c.id, d, 'pick') * tot, kind = keys[0]; for (const k of keys) { r -= w[k]; if (r <= 0) { kind = k; break; } }
    evSet(v, `k:${c.id}:${kind}`, at); const pn = String(p.profile.name || '').split(/\s+/)[0] || 'kamu', hr = (at % DAY) / 3600, tod = hr < 11 ? 'pagi' : hr < 15 ? 'siang' : hr < 18 ? 'sore' : 'malam', h = hf(c.id, d, kind), goal = c.goal, intr = parse(c.interests, [])[0];
    const E = {
      sapa: () => npcSay(p, c, 'sapa', say(c, 'sapa', h, { p: pn, t: tod }), at),
      kabar: () => { const good = hf(c.id, d, 'good') < 0.6; npcSay(p, c, good ? 'kabar_baik' : 'kesulitan', good ? T(['Aku baru saja dapat kabar baik soal ' + goal + '!', 'Akhirnya ' + goal + ' mulai ada hasilnya. Senang banget.'], h) : T(['Lagi agak pusing nih soal ' + goal + '. Banyak pikiran.', 'Beberapa hari ini aku kurang tenang, ' + goal + ' belum lancar.'], h), at); },
      makan: () => npcSay(p, c, 'ajak', T(['Besok ada waktu? Yuk makan bareng, aku yang cari tempat.', 'Ada warung baru dekat sini, mau coba bareng?'], h), at, { kind: 'makan' }),
      belajar: () => npcSay(p, c, 'ajak', T(['Mau belajar bareng akhir pekan ini? Aku butuh teman biar semangat.', 'Menjelang ujian, yuk kita latihan soal bareng.'], h), at, { kind: 'belajar' }),
      undangan: () => npcSay(p, c, 'ajak', T(['Akhir pekan ini ada acara ' + (intr || 'kumpul-kumpul') + ' kecil di lingkungan kita. Kamu mau ikut?', 'Aku mengundang kamu ke acara syukuran kecil. Kalau sempat, datang ya.'], h), at, { kind: 'undangan' }),
      tawar_bantu: () => npcSay(p, c, 'tawar_bantu', T(['Kalau ada yang bisa kubantu, bilang saja ya. Aku lagi agak longgar.', 'Aku lihat kamu sibuk akhir-akhir ini. Mau kubantu sesuatu?'], h), at),
      tawar_kerja: () => npcSay(p, c, 'tawar_kerja', T(['Di tempatku ada info lowongan magang. Menurutku cocok untukmu. Mau kukirim detailnya?', 'Ada peluang kerja paruh waktu yang kuingat kamu. Mau tahu info lengkapnya?'], h), at, { kind: 'lowongan' }),
      minta_bantu: () => { const kk = T(['belajar', 'temani', 'antar', 'saran'], h); npcSay(p, c, 'minta_bantu', { belajar: 'Bisa bantu aku belajar materi yang susah? Sekitar 2 jam saja.', temani: 'Boleh minta ditemani sebentar? Lagi butuh teman cerita.', antar: 'Bisa antar aku ke suatu tempat sebentar? Nanti kuganti ongkosnya.', saran: 'Aku bingung soal pilihan ke depan. Boleh minta saranmu?' }[kk], at, { kind: kk }); createReq(v, c.id, 'in', 'help', 0, 'Bantuan non-finansial: ' + HELP[kk].label, 1, at, at + 3 * DAY, { help: kk }); },
      minta_uang: () => { const need = parse(c.need) || { type: 'kebutuhan', amt: Math.round(c.income * 0.2 / 10_000) * 10_000 }, type = need.type; const amt = Math.max(50_000, Math.min(need.amt, Math.round(c.income * 0.8 / 10_000) * 10_000)), urg = type === 'darurat' ? 3 : type === 'sekolah' ? 2 : 1, due = (dayOf(at) + 7 + Math.floor(hf(c.id, d, 'dd') * 14));
        const why = { darurat: 'keperluan mendadak', sekolah: 'biaya sekolah', transport: 'ongkos transportasi', kebutuhan: 'kebutuhan sehari-hari', bagi_biaya: 'patungan kegiatan' }[type] || 'keperluan penting';
        const id = createReq(v, c.id, 'in', type, amt, why, urg, at, at + (urg >= 3 ? 2 : 4) * DAY, { dueDay: due }); db.prepare('UPDATE rl_contacts SET need=NULL WHERE visitor=? AND id=?').run(v, c.id);
        npcSay(p, c, 'minta_uang', say(c, 'minta_uang', h, {}) , at, { req: id }); },
    }; (E[kind] || E.sapa)();
    return true;
  }
  Object.assign(TXT, { minta_uang: { warm: ['Maaf merepotkan... aku lagi butuh bantuan uang. Boleh minta tolong?', 'Aku ada keperluan mendadak dan agak mepet. Bisa dibantu sedikit?'], reserved: ['Aku butuh bantuan uang. Kalau bisa.', 'Maaf, aku lagi kekurangan. Bisa bantu?'], formal: ['Mohon maaf mengganggu, saya perlu bantuan dana. Apakah memungkinkan?'], touchy: ['Aku tidak biasa minta... tapi sekarang butuh bantuan uang.'] } });
  function createReq(v, cid, dir, type, amount, reason, urgency, abs, dueAbs, meta = {}) {
    const id = rid('rq'); db.prepare('INSERT INTO rl_req (id, visitor, contact, dir, type, amount, reason, urgency, due_abs, status, created_abs, meta) VALUES (?,?,?,?,?,?,?,?,?,?,?,?)').run(id, v, cid, dir, type, amount, reason, urgency, Math.round(dueAbs), 'pending', Math.round(abs), JSON.stringify(meta)); return id;
  }
  // Permintaan masuk yang diabaikan → kedaluwarsa dengan konsekuensi sesuai urgensi dan kepribadian.
  function expireIncoming(p, clk) {
    const v = p.visitor;
    for (const r of db.prepare("SELECT * FROM rl_req WHERE visitor=? AND dir='in' AND status='pending' AND due_abs<=?").all(v, clk.abs)) {
      const c = fresh(v, r.contact); if (!c) continue; db.prepare("UPDATE rl_req SET status='expired' WHERE id=?").run(r.id);
      const hard = (r.urgency >= 3 ? 3 : r.urgency >= 2 ? 2 : 1) * (1.4 - P(c).soft); bump(v, c, { trust: -hard * 1.2, close: -hard * 0.8, mood: -6 }, r.due_abs); mem(v, c.id, 'ignored', `Permintaan ${REQ_TYPES[r.type] || 'bantuan'} tidak ditanggapi.`, r.due_abs, 2);
      addMsg(v, c.id, 'npc', P(c).voice === 'touchy' ? 'Sudah kuduga tidak ada jawaban. Aku cari bantuan lain.' : 'Karena belum ada kabar, aku cari bantuan dari tempat lain ya.', r.due_abs + 600, 'text'); setThread(v, c.id, 'conflict', null, null, r.due_abs + 600);
    }
  }

  // ——— pinjaman: jadwal cicilan, pembayaran NPC, pengingat utang, dampak keterlambatan ———
  const instDue = (L, k) => L.created_day + Math.round((L.due_day - L.created_day) * k / L.installments);
  const expectedPaid = (L, day) => { let k = 0; for (let i = 1; i <= L.installments; i++) if (instDue(L, i) <= day) k = i; return Math.round(L.total * k / L.installments); };
  const remaining = L => Math.max(0, L.total - L.paid);
  function loanDay(p, L, c, d, at) {
    const v = p.visitor, rem = remaining(L); if (rem <= 0) return;
    if (L.dir === 'owed_me') { // NPC berutang kepada pemain
      const exp = expectedPaid(L, d), owe = Math.min(rem, Math.max(0, exp - L.paid)); if (owe <= 0 || !cooled(v, `lp:${L.id}`, at, 6)) return;
      const rel = clamp(0.5 + c.close / 300 + P(c).soft * 0.2 + (c.trust - 50) / 400, 0.25, 0.95); evSet(v, `lp:${L.id}`, at);
      if (hf(L.id, d, 'pay') < rel && c.bal >= Math.min(owe, 50_000)) { const amt = Math.min(owe, Math.floor(c.bal * 0.85 / 1000) * 1000) || Math.min(owe, c.bal); npcRepay(p, L, c, amt, at); }
      else { const nid = createReq(v, c.id, 'in', 'tunda', owe, `Minta waktu membayar utang ${fmtRp(owe)}`, 1, at, at + 4 * DAY, { loan: L.id }); npcSay(p, c, 'minta_tunda', T(['Maaf ya, bulan ini agak ketat. Boleh aku bayar utangnya mundur seminggu?', 'Aku belum bisa melunasi tepat waktu. Bolehkah ditunda sedikit? Aku janji tepati.'], hf(L.id, d, 'tx')), at, { req: nid, loan: L.id }, 'negotiation'); mem(v, c.id, 'late', `Terlambat membayar utang ${fmtRp(owe)}.`, at, 2); }
    } else { // pemain berutang kepada NPC
      const exp = expectedPaid(L, d), owe = exp - L.paid; const dueToday = [...Array(L.installments).keys()].some(i => instDue(L, i + 1) === d);
      if (owe <= 0) return;
      if (dueToday && cooled(v, `lr:${L.id}:${d}`, at, 0.5)) { evSet(v, `lr:${L.id}:${d}`, at); npcSay(p, c, 'ingat_utang', T(['Pengingat ramah: cicilan/utangmu ' + fmtRp(owe) + ' jatuh tempo hari ini ya.', 'Hari ini jatuh tempo pembayaran ' + fmtRp(owe) + '. Kabari kalau ada kendala.'], hf(L.id, d, 'r')), at, { loan: L.id }, 'request_pending'); }
      else if (!dueToday) { const before = [...Array(L.installments).keys()].some(i => instDue(L, i + 1) - d === 3); if (before && cooled(v, `lb:${L.id}:${d}`, at, 0.5)) { evSet(v, `lb:${L.id}:${d}`, at); npcSay(p, c, 'ingat_utang', 'Sekadar mengingatkan, pembayaran ' + fmtRp(owe) + ' jatuh tempo 3 hari lagi.', at, { loan: L.id }, 'neutral'); } }
      // keterlambatan: dampak bertahap (tidak langsung merusak hubungan karena satu keterlambatan)
      const lateDays = d - Math.max(...[...Array(L.installments).keys()].map(i => instDue(L, i + 1)).filter(x => x <= d && expectedPaid(L, x) > L.paid), -1e9);
      if (lateDays >= 7 && Math.floor(lateDays / 7) > L.late_steps && L.late_steps < 4) { const step = Math.floor(lateDays / 7); db.prepare('UPDATE rl_loans SET late_steps=? WHERE id=?').run(step, L.id); bump(v, c, { trust: -(2 + (1 - P(c).soft) * 2), close: -1, mood: -4 }, at); mem(v, c.id, 'late', `Utang ${fmtRp(owe)} terlambat ${lateDays} hari.`, at, 3); if (cooled(v, `ll:${L.id}:${step}`, at, 1)) { evSet(v, `ll:${L.id}:${step}`, at); npcSay(p, c, 'ingat_utang', P(c).voice === 'touchy' ? 'Aku mulai kecewa soal utang ini. Tolong dibereskan.' : 'Utangnya sudah lewat jatuh tempo. Kapan kira-kira bisa dibayar?', at, { loan: L.id }, 'conflict'); } }
    }
  }
  function npcRepay(p, L, c, amt, at) {
    const v = p.visitor, idem = `rl-in-${L.id}-${Math.round(at)}`; const day = dayOf(at);
    const r = creditIn(p, { amount: amt, idem, kind: 'transfer', label: `Pembayaran utang dari ${c.name}`, account: L.recv || 'cash', day, sec: at % DAY }); if (r.error) return;
    db.prepare('UPDATE rl_contacts SET bal=MAX(0, bal-?) WHERE visitor=? AND id=?').run(amt, v, c.id); const paid = L.paid + amt, done = paid >= L.total;
    db.prepare('UPDATE rl_loans SET paid=?, status=? WHERE id=?').run(paid, done ? 'lunas' : 'aktif', L.id);
    db.prepare("INSERT INTO rl_xfer (id, visitor, contact, kind, amount, fee, tx, day, abs, note, req, loan, dir) VALUES (?,?,?,?,?,?,?,?,?,?,?,?,?)").run(rid('xf'), v, c.id, 'bayar_utang', amt, 0, r.id, day, Math.round(at), 'Pembayaran utang', null, L.id, 'in');
    addMsg(v, c.id, 'npc', done ? 'Utangnya sudah lunas ya. Terima kasih banyak sudah percaya padaku.' : `Aku bayar dulu ${fmtRp(amt)}. Sisanya menyusul ya.`, at, 'tx', { tx: r.id, amount: amt, dir: 'in', loan: L.id });
    bump(v, fresh(v, c.id), { trust: done ? 4 : 1, close: done ? 3 : 1, mood: 3 }, at); mem(v, c.id, 'repaid', done ? `Melunasi utang ${fmtRp(L.total)}.` : `Mencicil utang ${fmtRp(amt)}.`, at, done ? 3 : 1); setThread(v, c.id, done ? 'completed' : 'friendly', null, null, at);
  }
  // keputusan NPC atas permintaan dari pemain (deterministik): kemampuan finansial, kepercayaan, kepribadian, utang macet
  function decideAsk(v, c, r, abs) {
    const meta = parse(r.meta, {}), loans = db.prepare("SELECT * FROM rl_loans WHERE visitor=? AND contact=? AND dir='i_owe' AND status='aktif'").all(v, c.id), day = dayOf(abs);
    const overdue = loans.some(L => expectedPaid(L, day - 1) > L.paid);
    if (c.cat === 'stranger') return { res: 'declined', why: 'belum cukup kenal' };
    if (overdue) return { res: 'declined', why: 'masih ada utang lama yang belum beres' };
    if (c.trust < 22 + P(c).caution * 14 + (meta.mode === 'pinjam' ? 6 : 0)) return { res: 'declined', why: 'belum merasa cukup percaya' };
    if (c.mood < 25) return { res: 'declined', why: 'sedang kurang baik suasana hatinya' };
    const trustF = clamp(0.4 + c.trust / 100 * 0.9 + c.close / 400, 0.3, 1.4), cap = capacity(c, trustF);
    if (loans.length >= 2) return { res: 'declined', why: 'sudah punya beberapa urusan utang denganmu' };
    if (cap < 20_000) return { res: 'declined', why: 'kondisi keuangannya sedang tipis' };
    const give = Math.min(r.amount, cap); if (r.amount <= cap) return { res: 'accepted', amount: r.amount };
    return give >= r.amount * 0.35 ? { res: 'partial', amount: Math.floor(give / 10_000) * 10_000 || give } : { res: 'declined', why: 'jumlahnya melebihi kemampuannya' };
  }
  function resolveAsks(p, clk) {
    const v = p.visitor;
    for (const r of db.prepare("SELECT * FROM rl_req WHERE visitor=? AND dir='out' AND status='pending' AND resolve_abs<=? ORDER BY resolve_abs").all(v, clk.abs)) {
      const c = fresh(v, r.contact); if (!c) continue; const at = r.resolve_abs, meta = parse(r.meta, {}), d = decideAsk(v, c, r, at), why = REQ_TYPES[r.type] || 'bantuan';
      if (d.res === 'declined') { db.prepare("UPDATE rl_req SET status='declined' WHERE id=?").run(r.id); addMsg(v, c.id, 'npc', `Maaf ya, kali ini aku belum bisa membantu — ${d.why}.`, at, 'text', { req: r.id }); bump(v, c, { close: -0.5 }, at); mem(v, c.id, 'declined_player', `Menolak permintaan ${fmtRp(r.amount)} (${d.why}).`, at, 2); setThread(v, c.id, 'neutral', null, null, at); continue; }
      const amt = d.amount, loanTerms = meta.mode === 'pinjam';
      const idem = `rl-in-${r.id}`, dd = dayOf(at), cr = creditIn(p, { amount: amt, idem, kind: 'transfer', label: `${loanTerms ? 'Pinjaman' : 'Bantuan'} dari ${c.name}`, account: meta.recv || 'cash', day: dd, sec: at % DAY }); if (cr.error) continue;
      db.prepare('UPDATE rl_contacts SET bal=MAX(0, bal-?) WHERE visitor=? AND id=?').run(amt, v, c.id);
      let loanId = null; if (loanTerms) { const days = meta.dueDays || 30, rate = meta.interest || 0, total = Math.round(amt * (1 + rate * days / 30)); loanId = rid('ln'); db.prepare("INSERT INTO rl_loans (id, visitor, contact, dir, principal, total, interest, due_day, created_day, status, installments, recv, note) VALUES (?,?,?,?,?,?,?,?,?,?,?,?,?)").run(loanId, v, c.id, 'i_owe', amt, total, rate, dd + days, dd, 'aktif', meta.installments || 1, meta.recv || 'cash', why); }
      db.prepare("INSERT INTO rl_xfer (id, visitor, contact, kind, amount, fee, tx, day, abs, note, req, loan, dir) VALUES (?,?,?,?,?,?,?,?,?,?,?,?,?)").run(rid('xf'), v, c.id, loanTerms ? 'pinjaman' : 'bantuan', amt, 0, cr.id, dd, Math.round(at), why, r.id, loanId, 'in');
      db.prepare("UPDATE rl_req SET status=?, tx=?, loan=? WHERE id=?").run(d.res === 'partial' ? 'partial' : 'completed', cr.id, loanId, r.id);
      const terms = loanTerms ? ` Ini pinjaman: kembalikan ${fmtRp(Math.round(amt * (1 + (meta.interest || 0) * (meta.dueDays || 30) / 30)))} paling lambat ${dueText(dd + (meta.dueDays || 30))}${(meta.installments || 1) > 1 ? ` (${meta.installments}× cicilan)` : ''}.` : ' Ini bantuan, tidak perlu dikembalikan.';
      addMsg(v, c.id, 'npc', (d.res === 'partial' ? `Aku belum bisa sebanyak itu, tapi kukirim ${fmtRp(amt)} dulu ya.` : `Oke, kukirim ${fmtRp(amt)}.`) + terms, at, 'tx', { tx: cr.id, amount: amt, dir: 'in', loan: loanId, req: r.id });
      bump(v, c, { close: 1 }, at); mem(v, c.id, 'helped_player', `${loanTerms ? 'Meminjamkan' : 'Membantu'} ${fmtRp(amt)} kepada pemain.`, at, 3); setThread(v, c.id, loanTerms ? 'promise_made' : 'friendly', null, null, at);
    }
  }
  function notifyDue(p, clk) {
    const v = p.visitor;
    for (const m of db.prepare("SELECT m.id, m.contact, m.text, m.abs, c.name FROM rl_msgs m JOIN rl_contacts c ON c.visitor=m.visitor AND c.id=m.contact WHERE m.visitor=? AND m.who='npc' AND m.notified=0 AND m.abs<=? ORDER BY m.id LIMIT 12").all(v, clk.abs)) {
      CM.notify(v, `rl-${m.id}`, 'rl_msg', `Pesan dari ${m.name}`, m.text.slice(0, 90), m.abs); db.prepare('UPDATE rl_msgs SET notified=1 WHERE id=?').run(m.id);
    }
  }

  // ————————————————————————— tampilan —————————————————————————
  const unreadOf = (v, cid, abs) => db.prepare("SELECT COUNT(*) AS n FROM rl_msgs WHERE visitor=? AND contact=? AND who='npc' AND abs<=? AND id>COALESCE((SELECT MAX(id) FROM rl_msgs WHERE visitor=? AND contact=? AND who='me'),0)").get(v, cid, abs, v, cid).n;
  const contactOut = (v, c, abs) => { const av = avail(c, abs), last = db.prepare('SELECT who, text, abs FROM rl_msgs WHERE visitor=? AND contact=? AND abs<=? ORDER BY id DESC LIMIT 1').get(v, c.id, abs), th = thread(v, c.id);
    return { id: c.id, name: c.name, cat: c.cat, catLabel: CATS[c.cat] || c.cat, age: c.age, job: c.job, pers: c.pers, persLabel: P(c).label, trust: Math.round(c.trust), close: Math.round(c.close), mood: Math.round(c.mood), finance: band(c), avail: av.ok ? { ok: true } : { ok: false, why: av.why }, unread: unreadOf(v, c.id, abs), last: last || null, state: th.state, stateLabel: STATE_LABEL[th.state] || th.state, nInt: c.n_int, kind: c.kind }; };
  const reqOut = r => ({ id: r.id, contact: r.contact, dir: r.dir, type: r.type, typeLabel: REQ_TYPES[r.type] || (r.type === 'help' ? 'Bantuan non-finansial' : r.type === 'tunda' ? 'Minta tunda pembayaran' : r.type), amount: r.amount, reason: r.reason, urgency: r.urgency, dueAbs: r.due_abs, status: r.status, statusLabel: REQ_STATUS[r.status] || r.status, loan: r.loan, tx: r.tx, ext: r.ext, meta: parse(r.meta, {}) });
  const loanOut = (L, abs) => { const day = dayOf(abs), c = db.prepare('SELECT name FROM rl_contacts WHERE visitor=? AND id=?').get(L.visitor, L.contact); const nextK = [...Array(L.installments).keys()].map(i => i + 1).find(k => instDue(L, k) >= day && Math.round(L.total * k / L.installments) > L.paid); return { id: L.id, contact: L.contact, name: c?.name, dir: L.dir, principal: L.principal, total: L.total, interest: L.interest, paid: L.paid, remaining: remaining(L), dueDay: L.due_day, installments: L.installments, nextDue: nextK ? instDue(L, nextK) : null, nextAmount: nextK ? Math.max(0, Math.round(L.total * nextK / L.installments) - L.paid) : 0, status: L.status, overdue: L.status === 'aktif' && expectedPaid(L, day - 1) > L.paid, note: L.note }; };
  app.get('/api/rel/overview', wrap(({ v, clk }) => {
    const abs = clk.abs, cs = db.prepare('SELECT * FROM rl_contacts WHERE visitor=? ORDER BY id').all(v).map(c => contactOut(v, c, abs));
    cs.sort((a, b) => (b.last?.abs || 0) - (a.last?.abs || 0));
    const reqs = db.prepare("SELECT * FROM rl_req WHERE visitor=? AND status IN ('pending') ORDER BY created_abs DESC LIMIT 30").all(v).filter(r => r.created_abs <= abs).map(reqOut);
    const loans = db.prepare("SELECT * FROM rl_loans WHERE visitor=? ORDER BY status, created_day DESC LIMIT 40").all(v).map(L => loanOut(L, abs)), proms = db.prepare("SELECT p.*, c.name FROM rl_prom p JOIN rl_contacts c ON c.visitor=p.visitor AND c.id=p.contact WHERE p.visitor=? AND p.status='aktif' ORDER BY p.due_day LIMIT 20").all(v);
    const rep = repOf(v); return { ok: true, contacts: cs, requests: reqs, loans, promises: proms.map(x => ({ id: x.id, contact: x.contact, name: x.name, text: x.text, dueDay: x.due_day })), reputation: rep, unread: cs.reduce((s, c) => s + (c.unread ? 1 : 0), 0), cats: CATS, limits: { maxTransfer: MAX_XFER, maxDay: MAX_DAY, feeBank: FEE_BANK } };
  }));
  app.get('/api/rel/contact/:id', wrap(({ v, clk, req }) => {
    const c = contactOf(v, req.params.id), abs = clk.abs, mems = db.prepare('SELECT kind, text, abs, w FROM rl_mem WHERE visitor=? AND contact=? ORDER BY w DESC, id DESC LIMIT 8').all(v, c.id).sort((a, b) => b.abs - a.abs);
    const edges = db.prepare('SELECT * FROM rl_edges WHERE visitor=? AND (a=? OR b=?)').all(v, c.id, c.id).map(e => { const o = e.a === c.id ? e.b : e.a, n = db.prepare('SELECT id, name, cat FROM rl_contacts WHERE visitor=? AND id=?').get(v, o); return { id: o, name: n?.name, type: e.type }; }).filter(e => e.name);
    const loans = db.prepare("SELECT * FROM rl_loans WHERE visitor=? AND contact=? ORDER BY created_day DESC LIMIT 10").all(v, c.id).map(L => loanOut(L, abs)), xf = db.prepare('SELECT kind, amount, abs, note, dir, tx FROM rl_xfer WHERE visitor=? AND contact=? ORDER BY abs DESC LIMIT 10').all(v, c.id);
    return { ok: true, contact: { ...contactOut(v, c, abs), interests: parse(c.interests, []), goal: c.goal, metDay: c.met_day, rep: Math.round(c.rep) }, memories: mems, links: edges, loans, transfers: xf, timeline: db.prepare("SELECT kind, text, abs FROM rl_mem WHERE visitor=? AND contact=? AND abs<=? ORDER BY id DESC LIMIT 12").all(v, c.id, abs) };
  }));

  // ————————————————————————— chat —————————————————————————
  const OPEN_OPTS = [['sapa', 'Menyapa'], ['kabar', 'Menanyakan kabar'], ['ajak_ketemu', 'Mengajak bertemu'], ['ajak_belajar', 'Mengajak belajar bersama'], ['ajak_kerja', 'Mengajak bekerja sama'], ['ingat_janji', 'Mengingatkan janji'], ['bahas_masalah', 'Membahas masalah yang belum selesai']];
  const CTX_OPTS = {
    sapa: [['balas_sapa', 'Balas menyapa'], ['kabar', 'Menanyakan kabar'], ['ajak_ketemu', 'Mengajak bertemu']],
    kabar_baik: [['selamat', 'Beri ucapan selamat'], ['tanya_detail', 'Minta cerita lebih lanjut']],
    kesulitan: [['tawar_bantu', 'Ada yang bisa aku bantu?'], ['dengar', 'Ceritakan apa yang terjadi.'], ['dengar_saja', 'Aku belum bisa membantu secara finansial, tetapi aku bisa mendengarkan.'], ['pertimbangkan', 'Aku perlu waktu untuk mempertimbangkannya.'], ['maaf_tidak', 'Maaf, kali ini aku belum bisa membantu.']],
    ajak: [['ikut', 'Ikut, aku catat sebagai janji'], ['mungkin', 'Mungkin lain kali'], ['tolak', 'Maaf, belum bisa']],
    tawar_bantu: [['terima', 'Terima tawaran, terima kasih'], ['tolak_halus', 'Tidak perlu, terima kasih']],
    tawar_kerja: [['minta_info', 'Terima kasih, kirimkan detailnya'], ['tolak_halus', 'Terima kasih, belum tertarik']],
    minta_uang: [['tanya_jumlah', 'Tanyakan jumlah yang dibutuhkan'], ['tanya_alasan', 'Tanyakan alasan dan tenggat pengembalian'], ['tawar_kecil', 'Tawarkan jumlah yang lebih kecil'], ['tolak_sopan', 'Tolak dengan sopan'], ['minta_waktu', 'Minta waktu memeriksa kondisi keuangan']],
    minta_bantu: [['setuju_bantu', 'Bantu (lihat waktu & biaya)'], ['tolak_sopan', 'Maaf, belum bisa'], ['minta_waktu', 'Minta waktu mempertimbangkan']],
    minta_tunda: [['beri_tunda', 'Boleh, beri waktu 7 hari'], ['tegas', 'Aku butuh uangnya sesuai tanggal'], ['sebagian', 'Bayar sebagian dulu']],
    ingat_utang: [['minta_waktu_utang', 'Minta tambahan waktu'], ['janji_3', 'Janji bayar dalam 3 hari']],
    konflik: [['minta_maaf', 'Minta maaf'], ['jelaskan', 'Jelaskan situasinya'], ['beri_jarak', 'Beri jarak dulu']],
  };
  function currentCtx(v, cid) { const t = thread(v, cid); let ctx = t.ctx, ref = parse(t.ctx_ref, {}); const th = t; if (!ctx && ['conflict'].includes(th.state)) ctx = 'konflik'; if (ctx === 'minta_uang' && ref.req) { const r = db.prepare('SELECT status FROM rl_req WHERE id=?').get(ref.req); if (!r || r.status !== 'pending') ctx = null; } if (ctx === 'minta_bantu' && ref.req) { const r = db.prepare('SELECT status FROM rl_req WHERE id=?').get(ref.req); if (!r || r.status !== 'pending') ctx = null; } return { ctx, ref, state: th.state }; }
  app.get('/api/rel/chat/:id', wrap(({ v, clk, req }) => {
    const c = contactOf(v, req.params.id), abs = clk.abs; thread(v, c.id);
    const msgs = db.prepare('SELECT id, who, text, abs, kind, ref FROM rl_msgs WHERE visitor=? AND contact=? AND abs<=? ORDER BY id DESC LIMIT 60').all(v, c.id, abs).reverse().map(m => { const ref = parse(m.ref, null); let tx = null; if (ref?.tx) tx = db.prepare('SELECT status, amount, fee, label FROM fin_tx WHERE id=?').get(ref.tx) || null; return { id: m.id, who: m.who, text: m.text, abs: m.abs, kind: m.kind, ref: ref ? { ...ref, txStatus: tx?.status || null } : null }; });
    const typing = !!db.prepare('SELECT 1 FROM rl_msgs WHERE visitor=? AND contact=? AND who=\'npc\' AND abs>? LIMIT 1').get(v, c.id, abs), cx = currentCtx(v, c.id);
    const pendReq = db.prepare("SELECT * FROM rl_req WHERE visitor=? AND contact=? AND status='pending' AND created_abs<=? ORDER BY created_abs DESC LIMIT 3").all(v, c.id, abs).map(reqOut);
    const loans = db.prepare("SELECT * FROM rl_loans WHERE visitor=? AND contact=? AND status='aktif'").all(v, c.id).map(L => loanOut(L, abs));
    const quick = typing ? [] : (CTX_OPTS[cx.ctx] || OPEN_OPTS).map(([k, l]) => ({ k, l }));
    return { ok: true, contact: contactOut(v, c, abs), messages: msgs, typing, quick, ctx: cx.ctx, state: cx.state, stateLabel: STATE_LABEL[cx.state], requests: pendReq, loans, help: Object.entries(HELP).map(([k, h]) => ({ k, label: h.label, min: h.min, cost: h.cost })) };
  }));
  const FREE = [[/terima kasih|makasih|thanks|thx/i, 'thanks'], [/maaf|sorry/i, 'maaf'], [/transfer|kirim uang|sudah (aku )?bayar/i, 'transfer'], [/pinjam|utang|hutang|bantu(an)? uang|butuh uang/i, 'uang'], [/kabar|apa kabar|gimana/i, 'kabar'], [/ketemu|makan|nongkrong|jalan/i, 'ajak'], [/belajar|ujian|tugas/i, 'belajar'], [/halo|hai|hi\b|selamat|assalam/i, 'sapa']];
  const SUGGEST = ['Halo, apa kabar? Lagi sibuk apa?', 'Maaf kalau ada yang kurang berkenan, bisa kita bicarakan baik-baik?', 'Terima kasih sudah mau mendengarkan.'];
  const noteQuick = (v, c, abs, key, gain = true) => { // hitung interaksi + tambahan kedekatan terbatas per hari
    db.prepare('UPDATE rl_contacts SET n_int=n_int+1, last_me_abs=? WHERE visitor=? AND id=?').run(Math.round(abs), v, c.id); const gk = `gain:${c.id}:${dayOf(abs)}`, g = evGet(v, gk)?.n || 0; if (gain && g < 3) { evSet(v, gk, abs, g + 1); return true; } return false; };
  function respond(p, v, c, key, text, abs, b) {
    const pn = String(p.profile.name || '').split(/\s+/)[0] || 'kamu', hr = (abs % DAY) / 3600, tod = hr < 11 ? 'pagi' : hr < 15 ? 'siang' : hr < 18 ? 'sore' : 'malam', h = hf(c.id, abs, key), cx = currentCtx(v, c.id), A = avail(c, abs);
    const out = [], me = fresh(v, c.id); let eff = { trust: 0, close: 0, mood: 0 }, state = null, ctxNext = null, ref = null, prom = null;
    const grow = noteQuick(v, c, abs, key, !['maaf_tidak', 'tolak_sopan', 'tegas'].includes(key));
    switch (key) {
      case 'sapa': out.push(say(c, 'balas_sapa', h)); eff = { close: grow ? 1.2 : 0, mood: 1 }; state = 'friendly'; break;
      case 'balas_sapa': out.push(say(c, 'balas_sapa', h)); eff = { close: grow ? 1 : 0 }; state = 'friendly'; break;
      case 'kabar': out.push(say(c, 'kabar_reply', h, { goal: c.goal })); eff = { close: grow ? 1.2 : 0, trust: grow ? 0.3 : 0 }; state = 'friendly'; break;
      case 'tanya_detail': case 'dengar': out.push(say(c, 'listen', h)); eff = { close: grow ? 1.6 : 0, trust: 0.8, mood: 3 }; state = 'concerned'; break;
      case 'selamat': out.push(say(c, 'thanks', h)); eff = { close: grow ? 1.5 : 0, mood: 5 }; state = 'friendly'; break;
      case 'ajak_ketemu': case 'ajak_belajar': case 'ajak_kerja': { const yes = A.ok && c.mood > 35 && hf(c.id, abs, 'meet') < 0.45 + c.close / 200 + (c.job === 'Pelajar' && key === 'ajak_belajar' ? 0.2 : 0); out.push(yes ? say(c, key === 'ajak_belajar' ? 'study_yes' : 'meet_yes', h) : say(c, 'meet_no', h)); if (yes) { eff = { close: grow ? 1.5 : 0, trust: 0.5 }; prom = { text: `${key === 'ajak_belajar' ? 'Belajar bersama' : key === 'ajak_kerja' ? 'Bekerja sama' : 'Bertemu'} dengan ${c.name}`, days: 3 }; state = 'promise_made'; } else { eff = { mood: -1 }; state = 'neutral'; } break; }
      case 'tawar_bantu': case 'terima': out.push(say(c, key === 'terima' ? 'offer_thanks' : 'offer_thanks', h)); eff = { close: grow ? 1.5 : 0, trust: 0.6 }; state = 'friendly'; break;
      case 'tolak_halus': out.push(say(c, 'offer_decline', h)); state = 'neutral'; break;
      case 'minta_info': out.push('Oke, kukirim infonya ya: lowongan magang/paruh waktu di tempatku. Ini informasi saja — kamu tetap perlu melamar lewat menu Career.'); eff = { trust: 1, close: 1 }; state = 'friendly'; mem(v, c.id, 'referral', 'Membagikan info lowongan kepada pemain.', abs, 2); break;
      case 'dengar_saja': out.push(say(c, 'listen', h)); eff = { close: grow ? 1.4 : 0, trust: 0.6, mood: 2 }; state = 'concerned'; break;
      case 'pertimbangkan': case 'minta_waktu': out.push(say(c, 'wait_ok', h)); state = 'negotiation'; ctxNext = cx.ctx; ref = cx.ref; break;
      case 'maaf_tidak': case 'tolak_sopan': { out.push(say(c, 'declined_help', h)); const r = cx.ref?.req && db.prepare("SELECT * FROM rl_req WHERE id=? AND visitor=? AND status='pending'").get(cx.ref.req, v); const hard = (r ? r.urgency : 1) * (1.3 - P(c).soft) * 0.8; eff = { trust: -hard, close: -hard * 0.7, mood: -2 }; if (r) { db.prepare("UPDATE rl_req SET status='declined' WHERE id=?").run(r.id); mem(v, c.id, 'declined_request', `Pemain menolak permintaan ${REQ_TYPES[r.type] || 'bantuan'}.`, abs, 2); } state = 'neutral'; break; }
      case 'tanya_jumlah': case 'tanya_alasan': { const r = cx.ref?.req && db.prepare("SELECT * FROM rl_req WHERE id=? AND visitor=? AND status='pending'").get(cx.ref.req, v); if (!r) { out.push(say(c, 'generic', h)); break; } const m = parse(r.meta, {}); out.push(key === 'tanya_jumlah' ? say(c, 'ask_amount', h, { amt: fmtRp(r.amount), why: r.reason }) : say(c, 'ask_why', h, { why: r.reason, due: dueText(m.dueDay ?? dayOf(abs) + 14) })); state = 'negotiation'; ctxNext = 'minta_uang'; ref = cx.ref; eff = { trust: 0.4 }; break; }
      case 'tawar_kecil': { const r = cx.ref?.req && db.prepare("SELECT * FROM rl_req WHERE id=? AND visitor=? AND status='pending'").get(cx.ref.req, v); const amt = intIn(b.amount, 1000, MAX_XFER); if (!r) { out.push(say(c, 'generic', h)); break; } if (amt == null || amt >= r.amount) bad('Isi jumlah tawaran yang lebih kecil dari permintaan.'); out.push(amt >= r.amount * 0.3 ? say(c, 'smaller_ok', h) : say(c, 'refused', h)); db.prepare("UPDATE rl_req SET meta=? WHERE id=?").run(JSON.stringify({ ...parse(r.meta, {}), offer: amt }), r.id); state = 'negotiation'; ctxNext = 'minta_uang'; ref = cx.ref; break; }
      case 'ikut': { out.push(say(c, 'meet_yes', h)); eff = { close: grow ? 1.5 : 0, trust: 0.6 }; prom = { text: `Hadir: ajakan ${c.name}`, days: 4 }; state = 'promise_made'; break; }
      case 'mungkin': case 'tolak': out.push(say(c, 'meet_no', h)); eff = { close: key === 'tolak' ? -0.3 : 0 }; state = 'neutral'; break;
      case 'setuju_bantu': out.push('Makasih! Lihat dulu waktu dan biayanya di tombol Bantu ya.'); state = 'negotiation'; ctxNext = cx.ctx; ref = cx.ref; break;
      case 'beri_tunda': case 'tegas': case 'sebagian': { const r = cx.ref?.req && db.prepare("SELECT * FROM rl_req WHERE id=? AND visitor=? AND status='pending'").get(cx.ref.req, v), L = r && db.prepare("SELECT * FROM rl_loans WHERE id=? AND visitor=?").get(parse(r.meta, {}).loan, v); if (!r || !L) { out.push(say(c, 'generic', h)); break; }
        if (key === 'beri_tunda') { db.prepare('UPDATE rl_loans SET due_day=due_day+7 WHERE id=?').run(L.id); db.prepare("UPDATE rl_req SET status='completed' WHERE id=?").run(r.id); out.push(say(c, 'extension_ok', h)); eff = { trust: 1, close: 1.5, mood: 3 }; prom = { text: `${c.name} berjanji melunasi ${fmtRp(r.amount)}`, days: 7, loan: L.id, bySelf: true }; state = 'promise_made'; }
        else if (key === 'tegas') { db.prepare("UPDATE rl_req SET status='declined' WHERE id=?").run(r.id); out.push(say(c, 'extension_no', h)); eff = { trust: -0.5, close: -1, mood: -3 }; state = 'neutral'; }
        else { out.push(say(c, 'extension_ok', h)); db.prepare("UPDATE rl_req SET status='completed' WHERE id=?").run(r.id); eff = { trust: 0.5, close: 1 }; state = 'friendly'; } break; }
      case 'minta_waktu_utang': { const L = cx.ref?.loan && db.prepare("SELECT * FROM rl_loans WHERE id=? AND visitor=? AND dir='i_owe' AND status='aktif'").get(cx.ref.loan, v); if (!L) { out.push(say(c, 'generic', h)); break; } const ok = hf(c.id, L.id, 'ext') < 0.35 + P(c).soft * 0.5 + c.trust / 300 && L.due_day - dayOf(abs) < 20 && !evGet(v, `ext:${L.id}`); if (ok) { evSet(v, `ext:${L.id}`, abs); db.prepare('UPDATE rl_loans SET due_day=due_day+5, late_steps=0 WHERE id=?').run(L.id); out.push('Baiklah, kuberi tambahan 5 hari. Tolong ditepati ya.'); eff = { trust: -0.3 }; state = 'promise_made'; } else { out.push(P(c).voice === 'touchy' ? 'Aku sudah cukup longgar. Tolong dibayar tepat waktu.' : 'Maaf, aku juga butuh uangnya. Bisa dibayar sebagian dulu?'); eff = { trust: -1, close: -0.5 }; state = 'negotiation'; } ctxNext = 'ingat_utang'; ref = cx.ref; break; }
      case 'janji_3': { const L = cx.ref?.loan && db.prepare("SELECT * FROM rl_loans WHERE id=? AND visitor=? AND dir='i_owe' AND status='aktif'").get(cx.ref.loan, v); out.push('Oke, kutunggu ya. Kalau sudah, kabari.'); prom = { text: `Membayar utang kepada ${c.name}`, days: 3, loan: L?.id }; state = 'promise_made'; eff = { trust: 0.3 }; break; }
      case 'minta_maaf': { const soft = P(c).soft + c.trust / 200 + (hf(c.id, abs, 'sorry') - 0.5) * 0.3; if (soft > 0.45) { out.push(say(c, 'sorry_ok', h)); eff = { trust: 3, close: 3, mood: 8 }; state = 'reconciliation'; mem(v, c.id, 'reconcile', 'Pemain meminta maaf dan hubungan membaik.', abs, 3); } else { out.push(say(c, 'sorry_cold', h)); eff = { trust: 1, mood: 2 }; state = 'conflict'; } break; }
      case 'jelaskan': out.push(c.mood > 40 ? 'Oke, aku dengar penjelasanmu. Terima kasih mau menjelaskan.' : 'Aku butuh waktu dulu sebelum membahasnya.'); eff = { trust: c.mood > 40 ? 1.5 : 0 }; state = 'negotiation'; ctxNext = 'konflik'; break;
      case 'beri_jarak': out.push('Oke. Kita bicara lagi nanti ya.'); state = 'neutral'; eff = { mood: 1 }; break;
      case 'ingat_janji': { const pr = db.prepare("SELECT * FROM rl_prom WHERE visitor=? AND contact=? AND status='aktif' ORDER BY due_day LIMIT 1").get(v, c.id); out.push(pr ? `Iya, aku ingat: ${pr.text}. Sampai ketemu di hari ke-${pr.due_day + 1}.` : 'Janji apa ya? Sepertinya belum ada yang kita catat.'); break; }
      case 'bahas_masalah': { const bad2 = c.trust < 35 || c.mood < 45 || cx.state === 'conflict'; out.push(bad2 ? 'Iya, sebenarnya ada yang mengganjal. Aku hargai kamu mau membahasnya.' : 'Rasanya tidak ada masalah yang belum beres di antara kita.'); if (bad2) { eff = { trust: 1.2, mood: 3 }; state = 'negotiation'; ctxNext = 'konflik'; } break; }
      case 'free_thanks': out.push(say(c, 'thanks', h)); eff = { close: grow ? 0.6 : 0 }; state = 'friendly'; break;
      case 'free_maaf': { const hasIssue = cx.state === 'conflict' || c.trust < 35; if (hasIssue) return respond(p, v, c, 'minta_maaf', text, abs, b); out.push('Tidak apa-apa, santai saja.'); break; }
      case 'free_transfer': { const x = db.prepare("SELECT 1 FROM rl_xfer WHERE visitor=? AND contact=? AND dir='out' AND abs>=?").get(v, c.id, abs - 3 * DAY); out.push(x ? 'Iya, transfermu sudah tercatat di sistem. Terima kasih!' : 'Aku belum melihat transfer yang tercatat. Kalau memang mau mengirim, pakai tombol Transfer supaya tercatat resmi ya.'); break; }
      case 'free_uang': out.push('Kalau soal uang, pakai tombol Minta bantuan atau Transfer supaya jumlah, tenggat, dan syaratnya jelas tercatat ya.'); break;
      case 'free_kabar': return respond(p, v, c, 'kabar', text, abs, b);
      case 'free_ajak': return respond(p, v, c, 'ajak_ketemu', text, abs, b);
      case 'free_belajar': return respond(p, v, c, 'ajak_belajar', text, abs, b);
      case 'free_sapa': return respond(p, v, c, 'sapa', text, abs, b);
      default: out.push(say(c, 'generic', h));
    }
    return { out, eff, state, ctxNext, ref, prom };
  }
  app.post('/api/rel/chat/:id/send', guard(wrap(({ p, v, clk, req }) => {
    const b = req.body || {}, c = contactOf(v, req.params.id), abs = clk.abs; thread(v, c.id);
    if (b.idem) { if (!idemOk(b.idem)) bad('Kunci tidak valid.'); if (db.prepare('SELECT 1 FROM rl_msgs WHERE visitor=? AND contact=? AND idem=?').get(v, c.id, b.idem)) return { ok: true, duplicate: true }; }
    if (db.prepare("SELECT 1 FROM rl_msgs WHERE visitor=? AND contact=? AND who='npc' AND abs>? LIMIT 1").get(v, c.id, abs)) bad(`${c.name} masih mengetik balasan. Tunggu sebentar.`);
    const cx = currentCtx(v, c.id), allowed = (CTX_OPTS[cx.ctx] || OPEN_OPTS).map(x => x[0]); let key, shown, text = '';
    if (typeof b.quick === 'string' && b.quick) { if (!allowed.includes(b.quick)) bad('Pilihan balasan tidak tersedia pada percakapan ini.'); key = b.quick; shown = (CTX_OPTS[cx.ctx] || OPEN_OPTS).find(x => x[0] === key)[1]; if (key === 'tawar_kecil') shown = `Bagaimana kalau ${fmtRp(intIn(b.amount, 1, MAX_XFER) || 0)}?`; }
    else { text = str(b.text, MAX_MSG); if (text.length < 2) bad('Tulis pesan minimal 2 karakter.'); if (BAD.test(text) || THREAT.test(text) || HARASS.test(text)) { const e = new Error(); e.user = 'Pesan mengandung kata kasar, ancaman, atau pelecehan dan tidak dikirim. Coba kalimat yang lebih sopan.'; e.code = 422; e.extra = SUGGEST; throw e; } key = 'free_' + ((FREE.find(([re]) => re.test(text)) || [0, 'x'])[1]); shown = text; }
    const my = { whenAbs: abs }; addMsg(v, c.id, 'me', shown, abs, 'text', null, b.idem || null);
    const r = respond(p, v, c, key, text, abs, b); const at = replyAt(c, abs); r.out.forEach((s, i) => addMsg(v, c.id, 'npc', s, at + i * 20, 'text'));
    const cc = fresh(v, c.id); bump(v, cc, r.eff, abs); db.prepare('UPDATE rl_contacts SET last_npc_abs=MAX(last_npc_abs, ?) WHERE visitor=? AND id=?').run(Math.round(at), v, c.id);
    setThread(v, c.id, r.state || cx.state || 'neutral', r.ctxNext || null, r.ctxNext ? JSON.stringify(r.ref || cx.ref || {}) : null, at);
    if (r.prom) { const pid = rid('pm'); db.prepare("INSERT INTO rl_prom (id, visitor, contact, text, due_day, status, created_abs, loan) VALUES (?,?,?,?,?,?,?,?)").run(pid, v, c.id, r.prom.text, clk.day + r.prom.days, 'aktif', abs, r.prom.loan || null); }
    return { ok: true, state: r.state, eff: { trust: Math.round(r.eff.trust || 0), close: Math.round(r.eff.close || 0) } };
  })));
  // jawaban kaku saat sistem balasan bebas terbatas: sampaikan jelas ke pemain
  app.get('/api/rel/info', (req, res) => res.json({ ok: true, note: 'Balasan NPC dibuat dari templat dan aturan (kepribadian, hubungan, riwayat, jadwal), bukan pemahaman bahasa alami penuh. Pesan bebas dikenali lewat kata kunci sederhana.', personalities: Object.fromEntries(PKEYS.map(k => [k, PERS[k].label])), cats: CATS, reqTypes: REQ_TYPES }));

  // ————————————————————————— transfer antarindividu (lewat ledger Keuangan) —————————————————————————
  const KINDS = { hadiah: 'Hadiah', bantuan: 'Bantuan', pinjaman: 'Pinjaman', bayar_utang: 'Pembayaran utang', bagi_biaya: 'Berbagi biaya' };
  app.post('/api/rel/transfer', guard(wrap(({ p, v, clk, req }) => {
    const b = req.body || {}; if (!idemOk(b.idem)) bad('Kunci transaksi tidak valid.'); const dup = findIdem(v, b.idem); if (dup) return { ...dup, duplicate: true };
    const c = contactOf(v, b.contact), amount = intIn(b.amount, 1000, MAX_XFER); if (amount == null) bad(`Nominal transfer Rp 1.000 – ${fmtRp(MAX_XFER)}.`); const kind = KINDS[b.kind] ? b.kind : null; if (!kind) bad('Pilih jenis: hadiah, bantuan, pinjaman, pembayaran utang, atau bagi biaya.');
    if (c.cat === 'estranged' && kind === 'pinjaman') bad('Hubungan sedang renggang; pinjaman tidak dapat dibuat sekarang.');
    const today = db.prepare("SELECT COALESCE(SUM(amount),0) AS s FROM rl_xfer WHERE visitor=? AND day=? AND dir='out'").get(v, clk.day).s; if (today + amount > MAX_DAY) bad(`Melebihi batas transfer harian ke kontak (${fmtRp(MAX_DAY)}).`);
    let loan = null, rq = null; const note = str(b.note, 80);
    if (kind === 'bayar_utang') { loan = db.prepare("SELECT * FROM rl_loans WHERE id=? AND visitor=? AND contact=? AND dir='i_owe' AND status='aktif'").get(String(b.loan || ''), v, c.id); if (!loan) bad('Utang tidak ditemukan atau sudah lunas.', 404); if (amount > remaining(loan)) bad(`Nominal melebihi sisa utang (${fmtRp(remaining(loan))}).`); }
    if (b.request) { rq = db.prepare("SELECT * FROM rl_req WHERE id=? AND visitor=? AND contact=? AND dir='in' AND status='pending'").get(String(b.request), v, c.id); if (!rq) bad('Permintaan tidak ditemukan atau sudah ditanggapi.', 404); if (rq.created_abs > clk.abs) bad('Permintaan belum tersedia.'); }
    let terms = null; if (kind === 'pinjaman') { const days = intIn(b.dueDays ?? 30, 3, 365), rate = Number(b.interest ?? 0), inst = intIn(b.installments ?? 1, 1, 6); if (days == null || !(rate >= 0 && rate <= 0.1) || inst == null) bad('Tenggat 3–365 hari, bunga 0–10% per bulan, cicilan 1–6 kali.'); terms = { days, rate, inst }; if (rate > 0 && hf(c.id, amount, 'int') < P(c).caution * 0.6) bad(`${c.name} tidak mau menerima pinjaman berbunga. Coba tanpa bunga.`); }
    const src = X.fundSrc(v, b.method === 'cash' ? 'cash' : 'saldo', b.source); if (src.error) bad(src.error); if (src.type === 'acct') { const pe = checkPin(v, b.pin); if (pe) bad(pe); }
    const fee = src.type === 'acct' && src.acct.kind === 'bank' ? FEE_BANK : 0, total = amount + fee, err = debitSource(p, src, total, clk, src.kind); if (err) bad(err);
    const label = `${KINDS[kind]} ke ${c.name}${note ? ' — ' + note : ''}`;
    const t = addTx(v, { idem: b.idem, kind: 'transfer', status: 'berhasil', amount: -amount, fee, method: src.type === 'cash' ? 'cash' : 'transfer', src: src.type === 'cash' ? 'cash' : src.acct.id, merchant: null, label, day: clk.day, sec: clk.sec });
    applyDebit(p, src, total, clk, src.kind, 'transfer', label, t);
    db.prepare('UPDATE rl_contacts SET bal=bal+? WHERE visitor=? AND id=?').run(amount, v, c.id);
    let loanId = null; if (kind === 'pinjaman') { loanId = rid('ln'); const tot = Math.round(amount * (1 + terms.rate * terms.days / 30)); db.prepare("INSERT INTO rl_loans (id, visitor, contact, dir, principal, total, interest, due_day, created_day, status, installments, recv, note) VALUES (?,?,?,?,?,?,?,?,?,?,?,?,?)").run(loanId, v, c.id, 'owed_me', amount, tot, terms.rate, clk.day + terms.days, clk.day, 'aktif', terms.inst, src.type === 'cash' ? 'cash' : src.acct.id, note || 'Pinjaman'); }
    if (loan) { const paid = loan.paid + amount, done = paid >= loan.total; db.prepare('UPDATE rl_loans SET paid=?, status=? WHERE id=?').run(paid, done ? 'lunas' : 'aktif', loan.id); loanId = loan.id; if (done) { db.prepare("UPDATE rl_state SET kept=kept+1 WHERE visitor=?").run(v); } }
    const xid = rid('xf'); db.prepare("INSERT INTO rl_xfer (id, visitor, contact, kind, amount, fee, tx, day, abs, note, req, loan, dir) VALUES (?,?,?,?,?,?,?,?,?,?,?,?,?)").run(xid, v, c.id, kind, amount, fee, t, clk.day, Math.round(clk.abs), note, rq?.id || null, loanId, 'out');
    if (rq) { const full = amount >= rq.amount || rq.type === 'tunda', st = full ? 'completed' : 'partial'; db.prepare('UPDATE rl_req SET status=?, tx=?, loan=? WHERE id=?').run(st, t, loanId, rq.id); }
    addMsg(v, c.id, 'me', `${KINDS[kind]} ${fmtRp(amount)}${note ? ' — ' + note : ''}`, clk.abs, 'tx', { tx: t, amount, dir: 'out', loan: loanId, req: rq?.id || null });
    const cc = fresh(v, c.id), at = replyAt(c, clk.abs); let eff, line;
    if (kind === 'pinjaman') { eff = { trust: 1, close: 1.5, mood: 4 }; line = `Terima kasih banyak! Pinjaman ${fmtRp(amount)} kucatat, akan kukembalikan ${fmtRp(Math.round(amount * (1 + terms.rate * terms.days / 30)))} paling lambat ${dueText(clk.day + terms.days)}.`; }
    else if (kind === 'bayar_utang') { const done = loan.paid + amount >= loan.total; eff = { trust: done ? 3.5 : 1.5, close: done ? 2 : 0.8, mood: 3 }; line = done ? 'Utangmu sudah lunas. Terima kasih sudah menepati janji!' : `Terima kasih, ${fmtRp(amount)} sudah kuterima. Sisa utangmu ${fmtRp(remaining(loan) - amount)}.`; mem(v, c.id, done ? 'debt_paid' : 'debt_part', done ? `Pemain melunasi utang ${fmtRp(loan.total)}.` : `Pemain mencicil utang ${fmtRp(amount)}.`, clk.abs, done ? 3 : 1); }
    else { eff = { trust: 1.2, close: 2, mood: 6 }; line = P(cc).voice === 'touchy' ? `Terima kasih. Aku tidak akan lupa bantuan ini.` : `Terima kasih banyak ya, ini sangat membantu!`; }
    addMsg(v, c.id, 'npc', line, at, 'text'); bump(v, cc, eff, clk.abs); if (kind !== 'bayar_utang') mem(v, c.id, 'helped_npc', `Pemain ${kind === 'pinjaman' ? 'meminjamkan' : 'memberi'} ${fmtRp(amount)}.`, clk.abs, 3);
    setThread(v, c.id, kind === 'pinjaman' ? 'promise_made' : 'friendly', null, null, at);
    const out = { ...finView(p, clk.abs), ok: true, transfer: { id: xid, tx: t, amount, fee, kind, contact: c.id, name: c.name, loan: loanId }, msg: `${KINDS[kind]} ${fmtRp(amount)} ke ${c.name} berhasil${fee ? ` (biaya ${fmtRp(fee)})` : ''}.` };
    setResp(t, out); return out;
  })));

  // ————————————————————————— permintaan: respons pemain, permintaan ke NPC —————————————————————————
  app.post('/api/rel/request/:id/respond', wrap(({ v, clk, req }) => {
    const b = req.body || {}, r = db.prepare("SELECT * FROM rl_req WHERE id=? AND visitor=? AND dir='in'").get(req.params.id, v); if (!r) bad('Permintaan tidak ditemukan.', 404); if (r.status !== 'pending') bad(`Permintaan sudah ${REQ_STATUS[r.status]?.toLowerCase() || 'ditanggapi'}.`); const c = fresh(v, r.contact), act = b.action;
    if (act === 'decline') { const note = str(b.note, 100), hard = r.urgency * (1.3 - P(c).soft) * 0.8; db.prepare("UPDATE rl_req SET status='declined' WHERE id=?").run(r.id); bump(v, c, { trust: -hard, close: -hard * 0.7, mood: -3 }, clk.abs); mem(v, c.id, 'declined_request', `Pemain menolak permintaan ${REQ_TYPES[r.type] || 'bantuan'}.`, clk.abs, 2); addMsg(v, c.id, 'me', note || 'Maaf, kali ini aku belum bisa membantu.', clk.abs, 'text'); addMsg(v, c.id, 'npc', say(c, 'declined_help', hf(r.id, 'd')), replyAt(c, clk.abs), 'text'); setThread(v, c.id, 'neutral', null, null, clk.abs); return { ok: true, msg: 'Permintaan ditolak.' }; }
    if (act === 'later') { if (r.ext) bad('Waktu respons sudah pernah diperpanjang.'); db.prepare("UPDATE rl_req SET due_abs=due_abs+?, ext=1 WHERE id=?").run(DAY, r.id); addMsg(v, c.id, 'me', 'Aku perlu waktu memeriksa kondisi keuanganku dulu.', clk.abs, 'text'); addMsg(v, c.id, 'npc', say(c, 'wait_ok', hf(r.id, 'w')), replyAt(c, clk.abs), 'text'); setThread(v, c.id, 'negotiation', 'minta_uang', JSON.stringify({ req: r.id }), clk.abs); return { ok: true, msg: 'Waktu respons diperpanjang 1 hari.' }; }
    bad('Untuk menyetujui, kirim transfer dari layar Transfer (konfirmasi nominal & sumber dana diperlukan).');
  }));
  app.post('/api/rel/ask', guard(wrap(({ p, v, clk, req }) => {
    const b = req.body || {}; if (!idemOk(b.idem)) bad('Kunci tidak valid.'); const dup = db.prepare("SELECT id FROM rl_req WHERE visitor=? AND meta LIKE ?").get(v, `%"idem":"${b.idem}"%`); if (dup) return { ok: true, duplicate: true, request: reqOut(db.prepare('SELECT * FROM rl_req WHERE id=?').get(dup.id)) };
    const c = contactOf(v, b.contact), type = REQ_TYPES[b.type] && b.type !== 'bayar_utang' ? b.type : null; if (!type) bad('Pilih jenis permintaan.'); const amount = intIn(b.amount, 10_000, 5_000_000); if (amount == null) bad('Nominal bantuan Rp 10.000 – Rp 5.000.000.'); const mode = b.mode === 'pinjam' ? 'pinjam' : 'bantuan', reason = str(b.reason, 120); if (reason.length < 4) bad('Tulis alasan (min. 4 karakter).');
    if (db.prepare("SELECT 1 FROM rl_req WHERE visitor=? AND contact=? AND dir='out' AND status='pending'").get(v, c.id)) bad(`Permintaanmu ke ${c.name} masih menunggu jawaban.`);
    if (!cooled(v, `ask:${c.id}`, clk.abs, 3)) bad('Tunggu beberapa hari sebelum meminta bantuan lagi kepada kontak yang sama.');
    const meta = { mode, idem: b.idem, recv: b.recv && b.recv !== 'cash' ? String(b.recv) : 'cash' };
    if (mode === 'pinjam') { meta.dueDays = intIn(b.dueDays ?? 30, 3, 365); meta.interest = Number(b.interest ?? 0); meta.installments = intIn(b.installments ?? 1, 1, 6); if (meta.dueDays == null || !(meta.interest >= 0 && meta.interest <= 0.1) || meta.installments == null) bad('Tenggat 3–365 hari, bunga 0–10% per bulan, cicilan 1–6 kali.'); }
    if (b.recv && b.recv !== 'cash') { const a = X.fundSrc(v, 'saldo', b.recv); if (a.error) bad('Rekening penerima tidak valid.'); }
    evSet(v, `ask:${c.id}`, clk.abs); const delay = replyAt(c, clk.abs) + 200, id = rid('rq'); db.prepare('INSERT INTO rl_req (id, visitor, contact, dir, type, amount, reason, urgency, due_abs, status, created_abs, resolve_abs, meta) VALUES (?,?,?,?,?,?,?,?,?,?,?,?,?)').run(id, v, c.id, 'out', type, amount, reason, 1, clk.abs + 3 * DAY, 'pending', Math.round(clk.abs), Math.round(delay), JSON.stringify(meta));
    addMsg(v, c.id, 'me', `${mode === 'pinjam' ? 'Minta pinjaman' : 'Minta bantuan'} ${fmtRp(amount)} — ${REQ_TYPES[type]}: ${reason}${mode === 'pinjam' ? ` (kembali dalam ${meta.dueDays} hari${meta.interest ? `, bunga ${(meta.interest * 100).toFixed(1)}%/bulan` : ', tanpa bunga'})` : ' (tidak wajib dikembalikan jika disetujui)'}`, clk.abs, 'req', { req: id });
    setThread(v, c.id, 'request_pending', null, null, clk.abs); tick(p, { ...clk, abs: clk.abs }); return { ok: true, request: reqOut(db.prepare('SELECT * FROM rl_req WHERE id=?').get(id)), msg: `Permintaan dikirim ke ${c.name}. Jawaban tergantung jadwal dan kondisinya.` };
  })));
  app.post('/api/rel/request/:id/cancel', wrap(({ v, req }) => { const r = db.prepare("UPDATE rl_req SET status='cancelled' WHERE id=? AND visitor=? AND dir='out' AND status='pending'").run(req.params.id, v); if (!r.changes) bad('Permintaan tidak dapat dibatalkan.'); return { ok: true, msg: 'Permintaan dibatalkan.' }; }));

  // ————————————————————————— bantuan non-finansial & janji —————————————————————————
  function helpOdds(p, c, k, abs) { const h = HELP[k], A = avail(c, abs); const sk = p.game?.skills || {}, skill = h.skill === 'edu' ? 0.5 : (h.skill ? (Number(sk[h.skill]) || 0) / 100 : 0.4); const base = 0.35 + 0.25 * clamp(skill, 0, 1) + c.trust / 400 + c.close / 500 + (c.mood - 50) / 400; return { ok: A.ok, why: A.why, chance: Math.round(clamp(A.ok ? base : 0, 0, 0.95) * 100) / 100 }; }
  app.get('/api/rel/help/:id', wrap(({ p, v, clk, req }) => { const c = contactOf(v, req.params.id); return { ok: true, options: Object.entries(HELP).map(([k, h]) => ({ k, label: h.label, min: h.min, cost: h.cost, ...helpOdds(p, c, k, clk.abs) })) }; }));
  app.post('/api/rel/help', guard(wrap(({ p, v, clk, req }) => {
    const b = req.body || {}; if (!idemOk(b.idem)) bad('Kunci tidak valid.'); const dup = findIdem(v, 'rlh:' + b.idem); if (dup) return { ...dup, duplicate: true };
    const c = contactOf(v, b.contact), k = HELP[b.kind] ? b.kind : null; if (!k) bad('Pilih jenis bantuan.'); const h = HELP[k], odds = helpOdds(p, c, k, clk.abs); if (!odds.ok) bad(`${c.name} ${odds.why} saat ini. Coba lagi nanti.`);
    let rq = null; if (b.request) { rq = db.prepare("SELECT * FROM rl_req WHERE id=? AND visitor=? AND contact=? AND dir='in' AND status='pending' AND type='help'").get(String(b.request), v, c.id); if (!rq) bad('Permintaan tidak ditemukan atau sudah ditanggapi.', 404); }
    let out; const fee = h.cost; let t = null;
    if (fee > 0) { const src = X.fundSrc(v, b.method === 'cash' || !b.method ? 'cash' : 'saldo', b.source); if (src.error) bad(src.error); if (src.type === 'acct') { const pe = checkPin(v, b.pin); if (pe) bad(pe); } const err = debitSource(p, src, fee, clk, src.kind); if (err) bad(err); t = addTx(v, { idem: 'rlh:' + b.idem, kind: 'transfer', status: 'berhasil', amount: -fee, method: src.type === 'cash' ? 'cash' : 'transfer', src: src.type === 'cash' ? 'cash' : src.acct.id, label: `Biaya ${h.label.toLowerCase()} untuk ${c.name}`, day: clk.day, sec: clk.sec }); applyDebit(p, src, fee, clk, src.kind, 'transfer', `Biaya ${h.label.toLowerCase()}`, t); }
    const ok = hf(c.id, clk.abs, k, 'help') < odds.chance, eff = ok ? { trust: 2.2, close: 3, mood: 5 } : { trust: 0.3, close: 1, mood: 0 };
    bump(v, fresh(v, c.id), eff, clk.abs); db.prepare('UPDATE rl_contacts SET n_int=n_int+1 WHERE visitor=? AND id=?').run(v, c.id);
    mem(v, c.id, ok ? 'helped_npc' : 'tried_help', ok ? `Pemain ${h.label.toLowerCase()} dan berhasil.` : `Pemain mencoba ${h.label.toLowerCase()}, hasilnya kurang maksimal.`, clk.abs, ok ? 3 : 1);
    addMsg(v, c.id, 'npc', ok ? say(c, 'thanks', hf(c.id, k)) + ' Bantuanmu sangat berarti.' : 'Terima kasih sudah mencoba, walau hasilnya belum maksimal.', replyAt(c, clk.abs), 'text');
    if (rq) db.prepare("UPDATE rl_req SET status='completed' WHERE id=?").run(rq.id); if (k === 'lowongan' || k === 'hubungkan') { if (ok) addMsg(v, c.id, 'npc', 'Aku akan kabari kalau ada peluang yang cocok. Ini informasi, bukan jaminan diterima.', replyAt(c, clk.abs) + 30, 'text'); }
    out = { ...finView(p, clk.abs), ok: true, success: ok, minutes: h.min, cost: fee, label: h.label, msg: ok ? `${h.label} berhasil. Hubunganmu dengan ${c.name} membaik.` : `${h.label} selesai tetapi hasilnya kurang maksimal.` }; if (t) setResp(t, out); else db.prepare('INSERT INTO rl_ev (visitor, key, abs, n) VALUES (?,?,?,0) ON CONFLICT(visitor, key) DO NOTHING').run(v, 'rlh:' + b.idem, Math.round(clk.abs)); return out;
  })));
  app.post('/api/rel/promise/:id/:act', wrap(({ v, clk, req }) => {
    const pr = db.prepare("SELECT * FROM rl_prom WHERE id=? AND visitor=? AND status='aktif'").get(req.params.id, v); if (!pr) bad('Janji tidak ditemukan.', 404); const c = fresh(v, pr.contact), act = req.params.act;
    if (act === 'keep') { if (pr.loan) bad('Janji pembayaran dipenuhi lewat Transfer pembayaran utang.'); db.prepare("UPDATE rl_prom SET status='ditepati' WHERE id=?").run(pr.id); db.prepare('UPDATE rl_state SET kept=kept+1 WHERE visitor=?').run(v); bump(v, c, { trust: 3, close: 2, mood: 4 }, clk.abs); mem(v, c.id, 'kept', `Pemain menepati janji: ${pr.text}.`, clk.abs, 2); addMsg(v, c.id, 'npc', say(c, 'keep', hf(pr.id, 'k')), replyAt(c, clk.abs), 'text'); return { ok: true, msg: 'Janji ditepati. Kepercayaan meningkat.' }; }
    if (act === 'cancel') { db.prepare("UPDATE rl_prom SET status='dibatalkan' WHERE id=?").run(pr.id); bump(v, c, { trust: -1, close: -0.5 }, clk.abs); return { ok: true, msg: 'Janji dibatalkan; ini sedikit mengurangi kepercayaan.' }; }
    bad('Aksi tidak dikenal.');
  }));
  // janji yang lewat tanggal tanpa dipenuhi → dilanggar (dievaluasi tiap akses)
  const baseWrap = wrap; // eslint-disable-line
  const origTick = tick; void origTick;
  function brokenPromises(p, clk) {
    const v = p.visitor; for (const pr of db.prepare("SELECT * FROM rl_prom WHERE visitor=? AND status='aktif' AND due_day<?").all(v, clk.day)) {
      const c = fresh(v, pr.contact); if (!c) continue; if (pr.loan) { const L = db.prepare('SELECT * FROM rl_loans WHERE id=?').get(pr.loan); if (L && (L.status === 'lunas' || (L.dir === 'owed_me' ? false : L.paid >= expectedPaid(L, clk.day)))) { db.prepare("UPDATE rl_prom SET status='ditepati' WHERE id=?").run(pr.id); continue; } if (L && L.dir === 'owed_me') { db.prepare("UPDATE rl_prom SET status='selesai' WHERE id=?").run(pr.id); continue; } }
      db.prepare("UPDATE rl_prom SET status='dilanggar' WHERE id=?").run(pr.id); db.prepare('UPDATE rl_state SET broken=broken+1 WHERE visitor=?').run(v); bump(v, c, { trust: -(3 + (1 - P(c).soft) * 3), close: -1.5, mood: -5 }, (pr.due_day + WARM + 1) * DAY); mem(v, c.id, 'broken', `Pemain melanggar janji: ${pr.text}.`, (pr.due_day + WARM + 1) * DAY, 3);
      addMsg(v, c.id, 'npc', P(c).voice === 'touchy' ? 'Kamu tidak datang. Aku sudah menunggu.' : 'Hari ini aku menunggu, tapi kamu belum datang. Semoga semuanya baik-baik saja.', (pr.due_day + WARM + 1) * DAY + 8 * 3600, 'text'); setThread(v, c.id, 'conflict', 'konflik', null, (pr.due_day + WARM + 1) * DAY + 8 * 3600);
    }
  }
  const prevTick = tick; // pastikan evaluasi janji berjalan di setiap tick
  tick = function (p, clk) { prevTick(p, clk); brokenPromises(p, clk); }; // eslint-disable-line no-func-assign
  app.get('/api/rel/search', wrap(({ v, clk, req }) => { const q = str(req.query.q, 30).toLowerCase(); return { ok: true, contacts: db.prepare('SELECT * FROM rl_contacts WHERE visitor=? ORDER BY name').all(v).filter(c => !q || c.name.toLowerCase().includes(q) || (CATS[c.cat] || '').toLowerCase().includes(q)).map(c => contactOut(v, c, clk.abs)) }; }));
  return { migrate, reset, X: { tick, avail, capacity, PERS, CATS, repOf } };
};
