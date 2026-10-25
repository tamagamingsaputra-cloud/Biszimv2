// Overview · Channels & Accounts · detail platform · Content Planner
import { E, C, PRE, CR, PLATFORMS, NICHES, ACTIVE_PLATFORMS, fN, fInt, fPct, fmtG, fmtDay, pIcon, pName, fmtName, nName, thumb, statusChip, primary, momChip, momentumOf, res, progress, emptyBox, kpi, accounts, ageNow, rp, rpShort, gOfDay, T } from './common.js';
import { icon, esc, lineChart, openDialog } from '../../ui/ui.js';
import { bestHours, trendEvent, competition } from '../../engine/creator/audience.js';
import { capabilityMatrix, activeStrikes } from '../../engine/creator/rules.js';

const sum = (a, f) => a.reduce((s, x) => s + f(x), 0);

function money30() {
  const c = C(), d = E.dayNow();
  const received = sum(c.tx.filter(t => t.status === 'dibayar' && t.net > 0 && t.day > d - 30), t => t.net);
  const gearCost = sum(c.tx.filter(t => t.type === 'cost' && t.day > d - 30), t => -t.net);
  const prodCost = sum(c.costDaily.filter(r => r[0] > d - 30), r => r[1]) + sum(accounts(), a => a.today.cost || 0);
  const est = sum(accounts(), a => a.wallet.est), fin = sum(accounts(), a => a.wallet.final);
  const dia = sum(accounts().filter(a => PLATFORMS[a.id].support?.gifts), a => a.wallet.diamonds * PLATFORMS[a.id].support.gifts.idrPerDiamond);
  return { received, cost: gearCost + prodCost, prodCost, gearCost, est, fin, dia };
}

function ageGate() {
  const a = ageNow();
  if (a >= 13) return '';
  return `<div class="msg warn">${icon('lock')}<span><b>Akun kreator terbuka mulai usia 13 tahun simulasi</b> (usia karakter sekarang ${a} tahun). Kamu tetap bisa melihat Studio, aturan platform, dan perencanaan. Fokus saat ini: <a href="education.html">pendidikan</a>.</span></div>`;
}

export function overview() {
  const c = C(), accs = accounts(), d = E.dayNow();
  if (!accs.length) {
    return { html: `<div class="grid st-intro">
      <section class="panel"><div class="panel-h"><h2>Mulai karier kreator (opsional)</h2><span class="chip">Side income</span></div><div class="panel-b stack" style="gap:12px">
        ${ageGate()}
        <p style="margin:0">Buat akun di YouTube, TikTok, atau Instagram versi simulasi. Semua akun mulai dari <b>0 follower</b>. Konten diproduksi bertahap (riset → naskah → rekam → edit → review), memakai waktu luang, energi, skill, dan uang karakter.</p>
        <ul class="ticks"><li>Tidak ada topik yang menjamin viral. Performa dipengaruhi kualitas, kecocokan topik, jam posting, tren, persaingan, dan reputasi.</li><li>Konten buruk bisa menghabiskan biaya tanpa menghasilkan tayangan.</li><li>Pendapatan hanya dari program yang syaratnya terpenuhi dan kamu ajukan sendiri.</li></ul>
        <div class="row wrap"><a class="btn primary" href="#accounts" ${ageNow() < 13 ? 'aria-disabled="true"' : ''}>${icon('users')}Buat akun pertama</a><a class="btn" href="#accounts">Lihat aturan tiap platform</a></div>
      </div></section>
      ${tierCard()}</div>` };
  }
  const m = money30();
  const totalF = sum(accs, a => Math.floor(a.followers));
  const g7 = accs.map(a => { const t = CR.totals(a.id, 7); return { a, net: t.gained - t.lost, gained: t.gained, lost: t.lost, views: a.id === 'instagram' ? t.reach : t.views, rev: t.rev }; });
  const net7 = sum(g7, x => x.net);
  const inProd = c.queue.map(id => c.contents.find(k => k.id === id)).filter(Boolean), ready = c.contents.filter(k => k.status === 'ready');
  const eta = CR.queueEta();
  const notes = c.notes.slice(0, 40);
  const important = notes.filter(n => ['copyright', 'policy', 'strike', 'monetization'].includes(n.kind));
  const sched = upcoming(7);
  const L = c.live, nextLive = c.scheduledLives.filter(s => ['terjadwal', 'waktunya'].includes(s.status)).sort((a, b) => a.at - b.at)[0];
  const html = `
  <div class="kpis st-kpis">
    ${kpi('Total audiens lintas platform', fInt(totalF), accs.map(a => `${pName(a.id)} ${fN(a.followers)} ${PLATFORMS[a.id].followerShort}`).join(' · '), 'Subscriber YouTube dan follower TikTok/Instagram dijumlahkan sebagai “audiens”. Definisinya berbeda per platform.')}
    ${kpi('Pertumbuhan 7 hari', `<span class="${net7 >= 0 ? 'pos' : 'neg'}">${net7 >= 0 ? '+' : ''}${fInt(net7)}</span>`, `+${fInt(sum(g7, x => x.gained))} baru · −${fInt(sum(g7, x => x.lost))} berhenti mengikuti`)}
    ${kpi('Pendapatan diterima (30 hari)', rp(m.received), `Estimasi belum final ${rpShort(m.est)} · Menunggu bayar ${rpShort(m.fin)}${m.dia ? ` · Diamond ≈ ${rpShort(m.dia)}` : ''}`, 'Hanya uang yang sudah masuk saldo. Estimasi dan saldo menunggu pembayaran dipisahkan.')}
    ${kpi('Biaya kreator (30 hari)', rp(m.cost), `Produksi & live ${rpShort(m.prodCost)} · Alat, kelas, langganan ${rpShort(m.gearCost)}`)}
  </div>
  <div class="grid st-ov">
    <section class="panel"><div class="panel-h"><h2>Konten dalam proses</h2><a class="btn sm" href="#queue">Production Queue ${icon('arrowR')}</a></div><div class="panel-b stack" style="gap:10px">
      ${inProd.length || ready.length ? [...inProd.slice(0, 4).map(k => `<a class="q-mini" href="#queue">${thumb(k, 44)}<div class="grow"><div class="row between"><b class="clip">${esc(k.title)}</b>${statusChip(k)}</div>${progress(k)}<div class="subtle s">${Math.round(k.hoursDone / k.hoursTotal * 100)}% · ${pName(k.platform)} ${fmtName(k.platform, k.format)} · ${eta[k.id] ? `selesai ±${fmtG(eta[k.id], true)}` : 'ETA > 21 hari / terhambat'}${k.wait ? ` · ${esc(k.wait)}` : ''}</div></div></a>`),
        ...ready.slice(0, 3).map(k => `<a class="q-mini" href="#queue">${thumb(k, 44)}<div class="grow"><div class="row between"><b class="clip">${esc(k.title)}</b>${statusChip(k)}</div><div class="subtle s">Siap terbit — review lalu publikasikan atau jadwalkan.</div></div></a>`)].join('') : emptyBox('Belum ada konten diproduksi', 'Mulai dari Create Content.', `<a class="btn sm primary" href="#create">${icon('edit')}Buat konten</a>`)}
    </div></section>
    <section class="panel"><div class="panel-h"><h2>Jadwal 7 hari</h2><a class="btn sm" href="#planner">Planner ${icon('arrowR')}</a></div><div class="panel-b">
      ${sched.length ? `<ul class="agenda">${sched.slice(0, 7).map(s => `<li><span class="when num">${fmtG(s.g, true)}</span><span class="grow">${s.icon ? icon(s.icon) : ''}${esc(s.text)}</span></li>`).join('')}</ul>` : emptyBox('Tidak ada jadwal', 'Jadwalkan konten atau live dari Create Content / Live Studio.')}
    </div></section>
    <section class="panel"><div class="panel-h"><h2>Live</h2><a class="btn sm" href="#live">Live Studio ${icon('arrowR')}</a></div><div class="panel-b">
      ${L ? `<div class="row" style="gap:10px"><span class="live-dot"></span><div><b>Sedang live di ${pName(L.platform)}</b><div class="subtle">${L.minute} menit · ${Math.round(L.ccv)} menonton · ${fInt(L.unique)} penonton unik</div></div></div>`
        : nextLive ? `<div><b>Terjadwal:</b> ${esc(nextLive.title)}<div class="subtle">${pName(nextLive.platform)} · ${fmtG(nextLive.at)}</div></div>`
        : `<p class="subtle" style="margin:0">Tidak ada live aktif atau terjadwal.</p>${c.lives[0] ? `<p class="subtle s" style="margin:6px 0 0">Live terakhir: ${esc(c.lives[0].title)} — puncak ${fInt(c.lives[0].peak)} penonton.</p>` : ''}`}
    </div></section>
    <section class="panel st-notes"><div class="panel-h"><h2>Notifikasi</h2><button class="btn sm" data-a="read">Tandai dibaca</button></div><div class="panel-b">
      ${important.length ? `<div class="msg ${important.some(n => n.kind !== 'monetization') ? 'warn' : 'info'}" style="margin-bottom:10px">${icon('alert')}<span>${important.length} notifikasi hak cipta, pelanggaran, atau monetisasi.</span></div>` : ''}
      ${notes.length ? `<ul class="notes">${notes.slice(0, 12).map(n => `<li class="${n.read ? '' : 'unread'} k-${n.kind}"><span class="k">${noteLabel(n.kind)}</span><span class="grow">${esc(n.text)}</span><span class="subtle s num">${fmtG(n.g, true)}</span></li>`).join('')}</ul>` : emptyBox('Belum ada notifikasi', 'Notifikasi produksi, hak cipta, monetisasi, dan sponsor muncul di sini.')}
    </div></section>
    <section class="panel st-wide"><div class="panel-h"><h2>Per platform</h2><span class="subtle s">7 hari terakhir</span></div><div class="table-wrap"><table class="table">
      <thead><tr><th>Platform</th><th class="r">Audiens</th><th class="r">Metrik jangkauan</th><th class="r">Pertumbuhan</th><th class="r">Estimasi pendapatan</th><th>Program aktif</th></tr></thead>
      <tbody>${g7.map(x => { const P = PLATFORMS[x.a.id], pr = CR.programsFor(x.a.id), act = pr.filter(p => p.status === 'active').length; return `<tr><td><a class="row" style="gap:8px" href="#account/${x.a.id}">${pIcon(x.a.id, 14)}<span>${P.name}<br><span class="subtle s">@${esc(x.a.handle)}</span></span></a></td><td class="r num">${fInt(x.a.followers)} <span class="subtle s">${P.followerShort}</span></td><td class="r num">${fInt(x.views)} <span class="subtle s">${x.a.id === 'instagram' ? 'reach' : 'views'}</span></td><td class="r num ${x.net >= 0 ? 'pos' : 'neg'}">${x.net >= 0 ? '+' : ''}${fInt(x.net)}</td><td class="r num">${rp(x.rev)}</td><td>${act}/${pr.length}${pr.some(p => p.status === 'eligible') ? ' <span class="chip pos">bisa diajukan</span>' : ''}</td></tr>`; }).join('')}</tbody></table></div>
      <p class="subtle s" style="margin:8px 14px 12px">Views YouTube/TikTok = pemutaran; reach Instagram = akun unik yang melihat. Angka ini tidak sebanding langsung antarplatform.</p></section>
    ${tierCard()}
  </div>`;
  return { html, mount: el => el.addEventListener('click', e => { if (e.target.closest('[data-a="read"]')) res(CR.markNotesRead()); }) };
}
const noteLabel = k => ({ copyright: 'Hak cipta', policy: 'Kebijakan', strike: 'Strike', monetization: 'Monetisasi', sponsor: 'Sponsor', production: 'Produksi', growth: 'Pertumbuhan', live: 'Live', payout: 'Pembayaran' }[k] || 'Info');

export function tierCard() {
  const t = CR.tierInfo(), wh = E.weeklyHours(), en = E.energy(), c = C();
  const need = t.next?.need;
  return `<section class="panel"><div class="panel-h"><h2>Tahap karier kreator</h2><span class="chip">${esc(t.cur.name)}</span></div><div class="panel-b stack" style="gap:10px">
    ${need ? `<div class="subtle s">Menuju <b>${esc(t.next.name)}</b>:</div>
      ${reqBar('Audiens total', t.followers, need.followers)}${reqBar('Konten terbit', t.published, need.published)}${need.income30 != null ? reqBar('Pendapatan diterima 30 hari', t.income30, need.income30, rpShort) : ''}` : '<p class="subtle" style="margin:0">Tahap tertinggi tercapai.</p>'}
    <div class="divider"></div>
    <div class="row between"><span class="subtle">Energi karakter</span><b class="num">${Math.round(en)}/100</b></div><div class="bar ${en < 25 ? 'red' : 'green'}"><i style="width:${en}%"></i></div>
    <div class="row between"><span class="subtle">Waktu luang minggu ini</span><b class="num">${fN(wh.free)} jam</b></div>
    <div class="subtle s">Sekolah ${wh.school} j · kerja ${wh.job} j · kreator ${Math.round(wh.creator * 10) / 10} j dari ${wh.budget} j aktif/minggu. Batas kreator ${c.settings.dailyHours} jam/hari (ubah di Equipment & Skills).</div>
  </div></section>`;
}
export const reqBar = (label, cur, need, f = fInt) => `<div><div class="row between s"><span>${label}</span><span class="num">${f(cur)} / ${f(need)}</span></div><div class="bar ${cur >= need ? 'green' : ''}"><i style="width:${Math.min(100, cur / need * 100)}%"></i></div></div>`;

/** Agenda gabungan: konten terjadwal, ETA produksi, live terjadwal, tenggat sponsor, peristiwa tren. */
function upcoming(days) {
  const c = C(), g0 = E.S.clock.g, end = gOfDay(E.dayNow() + days), out = [], eta = CR.queueEta();
  for (const k of c.contents) if (k.status === 'scheduled' && k.scheduleG < end) out.push({ g: k.scheduleG, icon: 'calendar', text: `Terbit: ${k.title} (${pName(k.platform)} ${fmtName(k.platform, k.format)}${k.premiere ? ', Premiere' : ''})` });
  for (const [id, g] of Object.entries(eta)) if (g < end) { const k = c.contents.find(x => x.id === +id); if (k) out.push({ g, icon: 'layers', text: `Perkiraan selesai produksi: ${k.title}` }); }
  for (const s of c.scheduledLives) if (['terjadwal', 'waktunya'].includes(s.status) && s.at < end) out.push({ g: s.at, icon: 'broadcast', text: `Live: ${s.title} (${pName(s.platform)})` });
  for (const k of c.contracts) if (k.status === 'aktif') { const g = gOfDay(k.deadline + 1) - 1; if (g < end) out.push({ g, icon: 'handshake', text: `Tenggat sponsor ${k.brand}: ${k.delivered.length}/${k.qty} ${fmtName(k.platform, k.format)}` }); }
  return out.filter(s => s.g >= g0 - 1).sort((a, b) => a.g - b.g);
}

// ————————————————————————— Channels & Accounts —————————————————————————
export function accountsView() {
  const c = C(), mat = capabilityMatrix(), cols = Object.values(PLATFORMS);
  const card = P => {
    const acc = c.accounts[P.id];
    if (P.status !== 'active') return `<section class="panel acc-card planned"><div class="panel-h"><div class="row" style="gap:10px">${pIcon(P.id)}<div><h2>${P.name}</h2><div class="subtle s">Direncanakan</div></div></div><span class="chip">Belum tersedia</span></div><div class="panel-b"><p class="subtle" style="margin:0">${esc(P.desc || 'Arsitektur capability sudah disiapkan; aturan & simulasi platform ini belum diimplementasikan.')}</p></div></section>`;
    if (acc) {
      const st = activeStrikes(acc, E.dayNow());
      return `<section class="panel acc-card"><div class="panel-h"><div class="row" style="gap:10px">${pIcon(P.id)}<div><h2>${P.name}</h2><div class="subtle s">@${esc(acc.handle)} · ${nName(acc.niche)}</div></div></div>${acc.terminated ? '<span class="chip neg">Ditutup</span>' : st ? `<span class="chip neg">${st} strike</span>` : '<span class="chip pos">Aktif</span>'}</div>
        <div class="panel-b"><div class="grid g-3 mini-kpis">${kpi(P.followerLabel, fInt(acc.followers))}${kpi(P.id === 'instagram' ? 'Total tayang/jangkau' : 'Total views', fN(acc.totalViews))}${kpi('Reputasi', Math.round(acc.rep) + '/100')}</div>
        <div class="row wrap" style="margin-top:12px;gap:8px"><a class="btn primary sm" href="#account/${P.id}">Detail platform ${icon('arrowR')}</a><a class="btn sm" href="#create" data-pre="${P.id}">${icon('edit')}Buat konten</a></div></div></section>`;
    }
    const locks = CR.accountLocks(P.id);
    return `<section class="panel acc-card"><div class="panel-h"><div class="row" style="gap:10px">${pIcon(P.id)}<div><h2>${P.name}</h2><div class="subtle s">${esc(P.simName)} · mulai usia ${P.minAge}</div></div></div><span class="chip">Belum ada akun</span></div>
      <div class="panel-b stack" style="gap:10px"><p class="subtle" style="margin:0">${esc(P.desc)}</p>
      ${locks.length ? `<div class="msg warn">${icon('lock')}<span>${esc(locks[0])}</span></div>` : ''}
      <form class="stack" data-create="${P.id}" style="gap:8px">
        <label class="field"><span>Nama akun</span><div class="input-prefix"><span>@</span><input class="input" name="handle" maxlength="24" placeholder="mis. catatan.hemat" ${locks.length ? 'disabled' : ''} required></div></label>
        <label class="field"><span>Topik utama</span><select class="input" name="niche" ${locks.length ? 'disabled' : ''}>${NICHES.map(n => `<option value="${n.id}">${n.name} — kecocokan ${fitWord(n.fit[P.id])}</option>`).join('')}</select></label>
        <div class="err"></div>
        <button class="btn primary" ${locks.length ? 'disabled' : ''}>${icon('users')}Buat akun ${P.name} (gratis)</button>
      </form></div></section>`;
  };
  const html = `${ageGate()}<div class="grid acc-grid">${cols.map(card).join('')}</div>
  <section class="panel" style="margin-top:16px"><div class="panel-h"><h2>Capability matrix</h2><span class="subtle s">Fitur per platform di versi simulasi</span></div>
    <div class="table-wrap"><table class="table cap-table"><thead><tr><th>Kapabilitas</th>${cols.map(p => `<th class="c">${p.name}</th>`).join('')}</tr></thead>
    <tbody>${mat.map(r => `<tr><td>${r.label}</td>${r.cells.map(v => `<td class="c">${v === 'yes' ? `<span class="cap yes" title="Didukung">${icon('check')}</span>` : v === 'planned' ? '<span class="subtle s">rencana</span>' : '<span class="cap no" title="Tidak didukung">—</span>'}</td>`).join('')}</tr>`).join('')}</tbody></table></div>
    <p class="subtle s" style="margin:8px 14px 12px">Setiap platform punya konfigurasi kapabilitas sendiri — fitur YouTube tidak disalin ke TikTok/Instagram. Syarat di dalam game adalah aturan simulasi, bukan persyaratan resmi platform.</p></section>`;
  return {
    html, mount: el => {
      el.addEventListener('submit', e => {
        const f = e.target.closest('[data-create]'); if (!f) return; e.preventDefault();
        const fd = new FormData(f), r = CR.createAccount(f.dataset.create, fd.get('handle'), fd.get('niche'));
        if (!r.ok) { f.querySelector('.err').innerHTML = `<div class="msg error">${icon('alert')}<span>${esc(r.error)}</span></div>`; return; }
        res(r); location.hash = `#account/${f.dataset.create}`;
      });
      el.addEventListener('click', e => { const p = e.target.closest('[data-pre]'); if (p) PRE.pid = p.dataset.pre; });
    },
  };
}
const fitWord = v => v >= 1.2 ? 'tinggi' : v >= 1 ? 'baik' : v >= 0.85 ? 'sedang' : 'rendah';

export function accountDetail({ route }) {
  const pid = route[1], P = PLATFORMS[pid], c = C(), acc = c.accounts[pid];
  if (!P) return { html: emptyBox('Platform tidak ditemukan', '<a href="#accounts">Kembali</a>') };
  const back = `<a class="btn sm ghost" href="#accounts">${icon('arrowR', 'style="transform:rotate(180deg)"')}Channels & Accounts</a>`;
  const defs = Object.values(P.metricDefs || {}).map(t => { const [k, ...r] = t.split(':'); return `<dt>${esc(k)}</dt><dd>${esc(r.join(':').trim())}</dd>`; }).join('');
  const fmts = Object.entries(P.formats).map(([fid, f]) => {
    const locks = acc ? CR.formatLocksFor(pid, fid) : [];
    const life = f.expiresH ? `Hilang setelah ${f.expiresH} jam` : f.halfLife <= 1.6 ? 'Cepat naik, cepat turun' : f.halfLife <= 3 ? 'Umur sedang' : 'Umur panjang (pencarian)';
    const spec = f.durations ? `Durasi ${f.durations.map(s => s >= 60 ? `${s / 60} mnt` : `${s} dtk`).join(' / ')}` : f.photos ? `${f.photos.join(' / ')} foto` : 'Teks / gambar singkat';
    return `<tr><td><b>${f.name}</b>${locks.length ? `<div class="subtle s">${esc(locks[0])}</div>` : ''}</td><td>${spec}</td><td>${life}</td><td>${f.monetize.length ? f.monetize.map(m => P.programs[m]?.name || (m === 'ads_shorts' ? 'Iklan Shorts' : m)).join(', ') : '<span class="subtle">Tidak ada</span>'}</td></tr>`;
  }).join('');
  const liveReq = P.live ? `<ul class="ticks"><li>Usia minimal ${P.live.minAge} tahun simulasi</li>${P.live.minFollowers ? `<li>Minimal ${fInt(P.live.minFollowers)} ${P.followerShort}</li>` : ''}${P.live.mobileMinFollowers ? `<li>Live dari HP: minimal ${P.live.mobileMinFollowers} ${P.followerShort} (laptop/PC tidak perlu)</li>` : ''}<li>Kualitas: ${P.live.qualities.join(', ')}</li><li>Dukungan penonton: ${P.live.supports.map(s => P.support?.[s]?.name || P.programs[s]?.name || s).join(', ') || '—'}</li></ul>` : '<p class="subtle">Tidak ada live.</p>';
  if (!acc) return { html: `${back}<section class="panel" style="margin-top:12px"><div class="panel-h"><div class="row" style="gap:10px">${pIcon(pid)}<h2>${P.name}</h2></div><a class="btn primary sm" href="#accounts">Buat akun</a></div><div class="panel-b stack"><p style="margin:0">${esc(P.desc)}</p></div></section>
    <div class="grid g-2" style="margin-top:16px"><section class="panel"><div class="panel-h"><h2>Format konten</h2></div><div class="table-wrap"><table class="table"><thead><tr><th>Format</th><th>Spesifikasi</th><th>Pola tayangan</th><th>Monetisasi</th></tr></thead><tbody>${fmts}</tbody></table></div></section>
    <section class="panel"><div class="panel-h"><h2>Definisi metrik</h2></div><div class="panel-b"><dl class="dl defs">${defs}</dl></div></section></div>` };
  const t28 = CR.totals(pid, 28), st = activeStrikes(acc, E.dayNow());
  const locks = CR.liveLocksFor(pid), progs = CR.programsFor(pid);
  const recent = c.contents.filter(k => k.platform === pid && k.status === 'published').slice(-6).reverse();
  const html = `${back}
  <section class="panel" style="margin-top:12px"><div class="panel-h"><div class="row" style="gap:12px">${pIcon(pid, 22)}<div><h2>${P.name} · @${esc(acc.handle)}</h2><div class="subtle s">${nName(acc.niche)} · dibuat ${fmtDay(acc.createdDay)} · ${esc(P.simName)}</div></div></div>${acc.terminated ? '<span class="chip neg">Ditutup</span>' : st ? `<span class="chip neg">${st} strike aktif</span>` : '<span class="chip pos">Aktif</span>'}</div>
    <div class="panel-b"><div class="kpis">${kpi(P.followerLabel, fInt(acc.followers), `Puncak ${fInt(acc.peak)}`)}${kpi(pid === 'instagram' ? 'Reach 28 hari' : 'Views 28 hari', fInt(pid === 'instagram' ? t28.reach : t28.views))}${kpi('Reputasi', `${Math.round(acc.rep)}/100`, 'Turun karena clickbait, pelanggaran, live terlewat')}${kpi('Momentum algoritma', `×${acc.momentum.toLocaleString("id-ID", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`, 'Naik jika konten terbaru melebihi ekspektasi, turun jika di bawahnya', 'Dihitung engine dari performa 3 hari pertama tiap konten.')}</div>
    <h3 style="margin:16px 0 6px">${P.followerLabel} (30 hari tersimpan)</h3><div class="chart" id="acc-chart"></div></div></section>
  <div class="grid g-2" style="margin-top:16px">
    <section class="panel"><div class="panel-h"><h2>Format konten</h2></div><div class="table-wrap"><table class="table"><thead><tr><th>Format</th><th>Spesifikasi</th><th>Pola tayangan</th><th>Monetisasi</th></tr></thead><tbody>${fmts}</tbody></table></div></section>
    <section class="panel"><div class="panel-h"><h2>${P.live?.name || 'Live'}</h2>${locks.length ? '<span class="chip">Terkunci</span>' : '<span class="chip pos">Tersedia</span>'}</div><div class="panel-b">${liveReq}${locks.length ? `<div class="msg warn">${icon('lock')}<span>${locks.map(esc).join('<br>')}</span></div>` : `<a class="btn sm primary" href="#live">${icon('broadcast')}Siapkan live</a>`}</div></section>
    <section class="panel"><div class="panel-h"><h2>Program monetisasi</h2><a class="btn sm" href="#monetization">Kelola ${icon('arrowR')}</a></div><div class="panel-b"><ul class="prog-list">${progs.map(p => `<li><span class="grow">${esc(p.name)}</span>${progChip(p)}</li>`).join('')}</ul></div></section>
    <section class="panel"><div class="panel-h"><h2>Definisi metrik ${P.name}</h2></div><div class="panel-b"><dl class="dl defs">${defs}</dl></div></section>
    <section class="panel st-wide"><div class="panel-h"><h2>Konten terbaru</h2><a class="btn sm" href="#published">Semua ${icon('arrowR')}</a></div>${recent.length ? `<div class="table-wrap"><table class="table"><thead><tr><th>Konten</th><th class="r">Metrik utama</th><th>24 jam</th></tr></thead><tbody>${recent.map(k => { const [l, v] = primary(k); return `<tr><td><a class="row" style="gap:10px" href="#content/${k.id}">${thumb(k, 40)}<span class="clip">${esc(k.title)}<br><span class="subtle s">${fmtName(k.platform, k.format)} · ${fmtG(k.publishedG, true)}</span></span></a></td><td class="r num">${fInt(v)} <span class="subtle s">${l}</span></td><td>${momChip(momentumOf(k))}</td></tr>`; }).join('')}</tbody></table></div>` : `<div class="panel-b">${emptyBox('Belum ada konten terbit', 'Konten yang terbit di platform ini akan tampil di sini.')}</div>`}</section>
  </div>`;
  return { html, mount: el => { const s = CR.accountSeries(pid, 'followers', 30); const ch = el.querySelector('#acc-chart'); if (!lineChart(ch, s, { height: 170, floor: 0, yFmt: v => fN(v), tipFmt: v => fInt(v), xFmt: (d, l) => l ? fmtDay(d) : `H${d + 1}` })) ch.innerHTML = '<div class="chart-empty">Grafik muncul setelah 2 hari data tersimpan.</div>'; } };
}
export const progChip = p => p.status === 'active' ? '<span class="chip pos">Aktif</span>' : p.status === 'review' ? '<span class="chip info">Ditinjau</span>' : p.status === 'eligible' ? '<span class="chip pos">Syarat terpenuhi</span>' : p.status === 'suspended' ? '<span class="chip neg">Ditangguhkan</span>' : p.status === 'off' ? '<span class="chip">Dinonaktifkan</span>' : p.status === 'region' ? '<span class="chip">Tidak tersedia di wilayah simulasi</span>' : `<span class="chip">Terkunci · ${p.reqs.filter(r => r.met).length}/${p.reqs.length}</span>`;

// ————————————————————————— Content Planner —————————————————————————
export function planner() {
  const c = C(), d0 = E.dayNow(), seed = E.S.seed, accs = accounts();
  const pids = accs.length ? accs.map(a => a.id) : ACTIVE_PLATFORMS;
  const items = upcoming(14);
  const days = Array.from({ length: 14 }, (_, i) => d0 + i);
  for (const n of NICHES) { const ev = trendEvent(seed, n.id, d0); if (ev?.upcoming != null && ev.upcoming < d0 + 14) items.push({ g: gOfDay(ev.upcoming), icon: 'chart', text: `Perkiraan momen tren: ${n.name} (±${ev.len} hari)`, soft: true }); }
  const byDay = d => items.filter(s => Math.floor(s.g / T) - 14 === d);
  const frac = (E.S.clock.g % T) / T;
  const trendRows = NICHES.map(n => {
    const cells = pids.map(pid => { const v = CR.trend(seed, pid, n.id, d0 + frac), p = CR.trend(seed, pid, n.id, d0 - 7 + frac), ch = v / p - 1; return `<td class="r num"><span title="Indeks minat ${v.toLocaleString("id-ID", { minimumFractionDigits: 2, maximumFractionDigits: 2 })} (1,00 = normal)">${v.toLocaleString("id-ID", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</span> <span class="s ${ch >= 0 ? 'pos' : 'neg'}">${ch >= 0 ? '+' : ''}${Math.round(ch * 100)}%</span></td>`; }).join('');
    const ev = trendEvent(seed, n.id, d0), comp = competition(seed, pids[0], n.id, d0);
    return `<tr><td>${n.name}${ev?.active ? ' <span class="chip pos">momen tren</span>' : ''}</td>${cells}<td class="r num">${Math.round(comp * 100)}%</td></tr>`;
  }).join('');
  const drafts = c.contents.filter(k => k.status === 'draft').slice().reverse();
  const html = `<div class="grid st-plan">
    <section class="panel st-wide"><div class="panel-h"><h2>Kalender 14 hari</h2><a class="btn sm primary" href="#create">${icon('edit')}Buat konten</a></div><div class="panel-b">
      <div class="cal">${days.map(d => { const its = byDay(d); return `<div class="cal-day ${d === d0 ? 'today' : ''}"><div class="cal-h"><b>${fmtDay(d)}</b><span class="subtle s">H${d + 1}</span></div>${its.length ? its.map(s => `<div class="cal-it ${s.soft ? 'soft' : ''}">${icon(s.icon)}<span>${esc(s.text)}</span><span class="subtle s num">${String(Math.floor((s.g % T) / 2)).padStart(2, '0')}.${s.g % 2 ? '30' : '00'}</span></div>`).join('') : '<div class="subtle s">—</div>'}</div>`; }).join('')}</div>
    </div></section>
    <section class="panel"><div class="panel-h"><h2>Tren topik</h2><span class="subtle s">indeks minat simulasi</span></div><div class="table-wrap"><table class="table"><thead><tr><th>Topik</th>${pids.map(p => `<th class="r">${pName(p)}</th>`).join('')}<th class="r">Persaingan</th></tr></thead><tbody>${trendRows}</tbody></table></div>
      <p class="subtle s" style="margin:8px 14px 12px">1,00 = minat normal; persen = perubahan 7 hari. Tren menaikkan peluang jangkauan, tetapi <b>tidak ada topik yang menjamin viral</b> — kualitas, kecocokan, dan persaingan tetap menentukan.</p></section>
    <section class="panel"><div class="panel-h"><h2>Jam aktif audiens</h2></div><div class="panel-b stack" style="gap:10px">${pids.map(pid => `<div><div class="row" style="gap:8px">${pIcon(pid, 14)}<b>${pName(pid)}</b></div><div class="subtle s" style="margin-top:4px">Paling ramai: ${bestHours(pid, 3).map(h => `${String(h).padStart(2, '0')}.00`).join(', ')}</div></div>`).join('')}
      <p class="subtle s" style="margin:0">Pola aktivitas simulasi. Posting saat sepi mengurangi dorongan awal, tetapi konten bagus tetap bisa tumbuh belakangan.</p></div></section>
    <section class="panel st-wide"><div class="panel-h"><h2>Draft</h2><span class="subtle s">${drafts.length} draft</span></div>${drafts.length ? `<div class="table-wrap"><table class="table"><thead><tr><th>Konsep</th><th>Platform</th><th>Diubah</th><th class="r">Aksi</th></tr></thead><tbody>${drafts.map(k => `<tr><td><div class="row" style="gap:10px">${thumb(k, 40)}<span class="clip">${esc(k.title || '(tanpa judul)')}<br><span class="subtle s">${nName(k.niche)}</span></span></div></td><td>${pName(k.platform)} ${fmtName(k.platform, k.format)}</td><td class="subtle s">${fmtG(k.createdG, true)}</td><td class="r"><div class="row" style="gap:6px;justify-content:flex-end"><a class="btn sm primary" href="#create/draft/${k.id}">Lanjutkan</a><button class="btn sm" data-dup="${k.id}" title="Gandakan konsep">${icon('copy')}</button><button class="btn sm" data-del="${k.id}" title="Hapus draft" aria-label="Hapus draft">${icon('trash')}</button></div></td></tr>`).join('')}</tbody></table></div>` : `<div class="panel-b">${emptyBox('Belum ada draft', 'Simpan ide dari Create Content untuk dilanjutkan nanti.')}</div>`}</section>
  </div>`;
  return { html, mount: el => el.addEventListener('click', e => {
    const dp = e.target.closest('[data-dup]'); if (dp) return res(CR.duplicate(+dp.dataset.dup));
    const dl = e.target.closest('[data-del]'); if (dl && confirm('Hapus draft ini? Tindakan tidak bisa dibatalkan.')) return res(CR.deleteDraft(+dl.dataset.del));
  }) };
}
