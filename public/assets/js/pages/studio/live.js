// Live Studio — setup (9 langkah ringkas), jadwal, dashboard live (update parsial per menit simulasi), laporan.
import { E, C, CR, PLATFORMS, NICHES, ACTIVE_PLATFORMS, fN, fInt, fDia, fPct, fmtG, fmtDay, pIcon, pName, nName, res, emptyBox, kpi, rp, rpShort, gOfDay, T, accounts } from './common.js';
import { icon, esc, openDialog, lineChart } from '../../ui/ui.js';
import { LIVE_ACTIONS, STREAM_Q } from '../../data/creator-platforms.js';
import { gearItem } from '../../engine/creator/rules.js';

let SET = null;
const freshSet = () => { const a = accounts()[0]; return { platform: a?.id || 'youtube', niche: a?.niche || 'gaming', title: '', desc: '', quality: '720p', durMin: 60, when: 'now', day: 0, time: 40 }; };
const clockAt = (L, m) => { const t = (L.startG % T) * 30 + (L.startSub || 0) + m; const h = Math.floor(t / 60) % 24; return `${String(h).padStart(2, '0')}.${String(t % 60).padStart(2, '0')}`; };

function supportInfo(pid) {
  const P = PLATFORMS[pid], out = [];
  for (const sid of P.live?.supports || []) {
    const S = P.support?.[sid]; if (!S) { if (sid === 'membership') out.push(`<li><b>Memberships</b>: penghasilan bulanan, dikelola di Monetization.</li>`); continue; }
    if (S.unit === 'coin') out.push(`<li><b>${S.name}</b>: penonton membeli koin (simulasi Rp ${fInt(S.coinPrice)}/koin). Kreator menerima diamond: 1 koin → ${String(S.diamondPerCoin).replace('.', ',')} diamond, 1 diamond = Rp ${fInt(S.idrPerDiamond)}. Jadi dari Rp ${fInt(S.coinPrice)} yang dibayar penonton, kreator menerima Rp ${fInt(S.diamondPerCoin * S.idrPerDiamond)} (${fPct(S.diamondPerCoin * S.idrPerDiamond / S.coinPrice, 0)}) sebelum biaya tarik Rp ${fInt(S.withdrawFee)} & pajak simulasi.</li>`);
    else out.push(`<li><b>${S.name}</b>: nominal ${S.tiers.map(x => rpShort(x)).join(' / ')}; kreator menerima ${fPct(S.share, 0)}, potongan platform ${fPct(1 - S.share, 0)} (simulasi).</li>`);
  }
  return out.join('');
}

function setupView() {
  const c = C(), accs = accounts();
  if (!SET || !c.accounts[SET.platform]) SET = freshSet();
  const s = SET, P = PLATFORMS[s.platform], locks = CR.liveLocksFor(s.platform), sup = CR.supportsFor(s.platform);
  const net = gearItem('internet', c.gear.internet), cam = gearItem('camera', c.gear.camera), comp = gearItem('computer', c.gear.computer);
  const sq = STREAM_Q[s.quality], qOk = net.net >= sq.need;
  const costH = (net.dataCost ? sq.dataPerHour : 0) + 1500;
  const d0 = E.dayNow();
  const step = (n, t, inner) => `<div class="ls-step"><div class="n">${n}</div><div class="grow"><b>${t}</b>${inner}</div></div>`;
  return `<section class="panel"><div class="panel-h"><h2>Siapkan live</h2>${locks.length ? '<span class="chip">Terkunci</span>' : '<span class="chip pos">Syarat terpenuhi</span>'}</div><div class="panel-b stack" style="gap:12px" id="ls-form">
    ${step(1, 'Platform', `<div class="seg" style="margin-top:6px">${ACTIVE_PLATFORMS.map(p => `<button type="button" class="${s.platform === p ? 'on' : ''}" data-lp="${p}" ${c.accounts[p] ? '' : 'disabled'}>${pName(p)}</button>`).join('')}</div>`)}
    ${step(2, 'Syarat akun', locks.length ? `<div class="msg warn" style="margin-top:6px">${icon('lock')}<span>${locks.map(esc).join('<br>')}</span></div>` : `<div class="subtle s">Semua syarat live ${P.name} (simulasi) terpenuhi.</div>`)}
    ${step(3, 'Kategori', `<select class="input" name="niche">${NICHES.map(n => `<option value="${n.id}" ${s.niche === n.id ? 'selected' : ''}>${n.name}</option>`).join('')}</select>`)}
    ${step(4, 'Judul & deskripsi', `<input class="input" name="title" maxlength="100" value="${esc(s.title)}" placeholder="mis. Belajar bareng sampai jam 9"><textarea class="input" name="desc" rows="2" maxlength="300" placeholder="Deskripsi singkat (opsional)" style="margin-top:6px">${esc(s.desc)}</textarea>`)}
    ${step(5, 'Perangkat & kualitas stream', `<div class="subtle s">${esc(cam.name)} · ${esc(comp.name)} · ${esc(net.name)}</div><div class="seg" style="margin-top:6px">${P.live.qualities.map(q => `<button type="button" class="${s.quality === q ? 'on' : ''}" data-lq="${q}">${q}</button>`).join('')}</div>${qOk ? '' : `<div class="msg warn" style="margin-top:6px">${icon('alert')}<span>Internet saat ini kurang untuk ${s.quality}; stream akan sering tersendat. Pilih kualitas lebih rendah atau upgrade internet.</span></div>`}`)}
    ${step(6, 'Durasi rencana', `<div class="seg" style="margin-top:6px">${[30, 60, 90, 120, 180].map(m => `<button type="button" class="${+s.durMin === m ? 'on' : ''}" data-ld="${m}">${m} mnt</button>`).join('')}</div><div class="subtle s">Biaya data & listrik ±${rp(costH)}/jam. Energi berkurang selama live.</div>`)}
    ${step(7, 'Fitur dukungan penonton', sup.length ? `<ul class="ticks s">${supportInfo(s.platform)}</ul>` : `<div class="subtle s">Belum ada fitur dukungan aktif untuk akun ini (perlu program yang syaratnya terpenuhi & diajukan di Monetization). Live tetap bisa menambah penonton & follower.</div>`)}
    ${step(8, 'Kapan', `<div class="seg" style="margin-top:6px"><button type="button" class="${s.when === 'now' ? 'on' : ''}" data-lw="now">Mulai sekarang</button><button type="button" class="${s.when === 'sched' ? 'on' : ''}" data-lw="sched">Jadwalkan</button></div>${s.when === 'sched' ? `<div class="row wrap" style="gap:8px;margin-top:6px"><select class="input" name="day">${Array.from({ length: 14 }, (_, i) => `<option value="${i}" ${+s.day === i ? 'selected' : ''}>${i === 0 ? 'Hari ini' : i === 1 ? 'Besok' : `+${i} hari`} (H${d0 + i + 1})</option>`).join('')}</select><select class="input" name="time">${Array.from({ length: 48 }, (_, i) => `<option value="${i}" ${+s.time === i ? 'selected' : ''}>${String(Math.floor(i / 2)).padStart(2, '0')}.${i % 2 ? '30' : '00'}</option>`).join('')}</select></div><div class="subtle s">Follower mendapat pengingat; live yang dimulai tepat waktu mendapat dorongan notifikasi lebih besar. Jadwal yang terlewat menurunkan reputasi.</div>` : ''}`)}
    ${step(9, s.when === 'now' ? 'Mulai live' : 'Simpan jadwal', `<div id="ls-err"></div><div class="row wrap" style="gap:8px;margin-top:6px"><button class="btn primary" data-a="${s.when === 'now' ? 'start' : 'sched'}" ${locks.length && s.when === 'now' ? 'disabled' : ''}>${icon(s.when === 'now' ? 'broadcast' : 'calendar')}${s.when === 'now' ? 'Mulai live sekarang' : 'Jadwalkan live'}</button></div><div class="subtle s" style="margin-top:6px">Saat live, waktu simulasi berjalan per menit (1 detik nyata = 1 menit pada kecepatan 1×).</div>`)}
  </div></section>`;
}

function scheduledList() {
  const c = C(), list = c.scheduledLives.filter(s => ['terjadwal', 'waktunya'].includes(s.status)).sort((a, b) => a.at - b.at);
  return `<section class="panel"><div class="panel-h"><h2>Live terjadwal</h2></div><div class="panel-b stack" style="gap:8px">${list.length ? list.map(s => `<div class="row between wrap" style="gap:8px"><div>${pIcon(s.platform, 10)} <b>${esc(s.title)}</b><div class="subtle s">${pName(s.platform)} · ${fmtG(s.at)} · ${s.durMin} menit${s.status === 'waktunya' ? ' · <b class="pos">waktunya sekarang</b>' : ''}</div></div><div class="row" style="gap:6px">${s.status === 'waktunya' || s.at - E.S.clock.g <= 2 ? `<button class="btn sm primary" data-golive="${s.id}">Mulai</button>` : ''}<button class="btn sm" data-unlive="${s.id}">Batalkan</button></div></div>`).join('') : '<p class="subtle" style="margin:0">Tidak ada live terjadwal.</p>'}</div></section>`;
}
function reports() {
  const c = C();
  return `<section class="panel"><div class="panel-h"><h2>Laporan live</h2><span class="subtle s">${c.lives.length}</span></div>${c.lives.length ? `<div class="table-wrap"><table class="table"><thead><tr><th>Live</th><th class="r">Durasi</th><th class="r">Puncak</th><th class="r">Unik</th><th class="r">Follower</th><th class="r">Bersih kreator</th></tr></thead><tbody>${c.lives.slice(0, 15).map(r => `<tr data-rep="${r.id}" tabindex="0" class="click"><td>${pIcon(r.platform, 10)} ${esc(r.title)}<div class="subtle s">${fmtG(r.startG, true)} · ${esc(r.reason)}</div></td><td class="r num">${r.minutes} m</td><td class="r num">${fInt(r.peak)}</td><td class="r num">${fInt(r.unique)}</td><td class="r num">+${fInt(r.follows)}</td><td class="r num">${rp(r.net - r.cost)}</td></tr>`).join('')}</tbody></table></div>` : `<div class="panel-b">${emptyBox('Belum ada live', 'Laporan setiap sesi (penonton, chat, dukungan, biaya) tersimpan di sini.')}</div>`}</section>`;
}

function reportDialog(id) {
  const r = C().lives.find(x => x.id === id); if (!r) return;
  const P = PLATFORMS[r.platform];
  openDialog(`<div class="dlg-h"><h2>Laporan live</h2><button class="icon-btn" data-close aria-label="Tutup">${icon('x')}</button></div><div class="dlg-b stack">
    <div><b>${esc(r.title)}</b><div class="subtle s">${pName(r.platform)} · ${nName(r.niche)} · ${r.quality} · ${fmtG(r.startG)} · ${r.minutes} menit · ${esc(r.reason)}</div></div>
    <div class="kpis">${kpi('Puncak penonton', fInt(r.peak))}${kpi('Rata-rata bersamaan', fInt(r.avg))}${kpi('Penonton unik', fInt(r.unique))}${kpi('Follower baru', '+' + fInt(r.follows))}${kpi('Chat', fInt(r.chat))}${kpi('Likes', fN(r.likes))}</div>
    <div class="chart" id="rp-chart"></div>
    <h3 style="margin:4px 0">Dukungan</h3>${Object.keys(r.giftAgg).length ? `<div class="table-wrap"><table class="table"><thead><tr><th>Jenis</th><th class="r">Jumlah</th>${r.coins ? '<th class="r">Koin</th>' : ''}<th class="r">Dibayar penonton</th><th class="r">Bersih kreator</th></tr></thead><tbody>${Object.entries(r.giftAgg).map(([k, a]) => `<tr><td>${esc(k)}</td><td class="r num">${a.n}</td>${r.coins ? `<td class="r num">${fInt(a.coins)}</td>` : ''}<td class="r num">${rp(a.gross)}</td><td class="r num">${rp(a.net)}</td></tr>`).join('')}</tbody></table></div>` : '<p class="subtle" style="margin:0">Tidak ada dukungan pada sesi ini.</p>'}
    <dl class="dl"><dt>Kotor (dibayar penonton)</dt><dd class="num">${rp(r.gross)}</dd><dt>Potongan platform</dt><dd class="num">−${rp(r.fee)}</dd><dt>Bersih kreator</dt><dd class="num">${rp(r.net)}${r.diamonds ? ` (${fDia(r.diamonds)} diamond, belum ditarik)` : ' (estimasi, dibayar saat payout)'}</dd><dt>Biaya live</dt><dd class="num">−${rp(r.cost)}</dd><dt><b>Hasil bersih sesi</b></dt><dd class="num"><b>${rp(r.net - r.cost)}</b></dd><dt>Gangguan koneksi</dt><dd>${r.lagCount}×</dd></dl>
  </div><div class="dlg-f"><button class="btn primary" data-close>Tutup</button></div>`, { wide: true, onMount: d => { const ch = d.querySelector('#rp-chart'); if (!lineChart(ch, r.series, { height: 160, floor: 0, yFmt: v => fN(v), tipFmt: v => `${fInt(v)} penonton`, xFmt: m => `menit ${m}` })) ch.innerHTML = '<div class="chart-empty">Data terlalu pendek.</div>'; } });
}

// ————————————————————————— dashboard live —————————————————————————
function dash() {
  return `<div class="live-wrap">
    <section class="panel live-top"><div class="panel-b"><div class="row between wrap" style="gap:10px"><div class="row" style="gap:10px"><span class="live-dot"></span><div><b id="lv-title"></b><div class="subtle s" id="lv-sub"></div></div></div><div class="row" style="gap:8px"><span class="chip" id="lv-time"></span><button class="btn danger" data-a="end">${icon('stop')}Akhiri live</button></div></div>
      <div class="kpis live-kpis" id="lv-kpis"></div></div></section>
    <div class="grid live-grid">
      <section class="panel"><div class="panel-h"><h2>Penonton bersamaan</h2><span class="subtle s" id="lv-q"></span></div><div class="panel-b"><div class="chart" id="lv-chart"></div><div id="lv-warn"></div></div></section>
      <section class="panel live-feed"><div class="panel-h"><h2>Chat & aktivitas</h2></div><ul class="feed" id="lv-feed" aria-live="polite"></ul></section>
      <section class="panel"><div class="panel-h"><h2>Aksi host</h2></div><div class="panel-b"><div class="live-actions" id="lv-actions"></div><p class="subtle s" style="margin:8px 0 0">Setiap aksi punya jeda dan efek terbatas waktu terhadap chat, retensi, follow, atau dukungan. Energi karakter berkurang.</p></div></section>
      <section class="panel"><div class="panel-h"><h2>Dukungan & pendapatan sesi</h2></div><div class="panel-b" id="lv-money"></div></section>
      <section class="panel st-wide"><div class="panel-h"><h2>Dukungan masuk</h2></div><div class="table-wrap" id="lv-gifts"></div></section>
    </div>
    <div class="live-bar"><span class="live-dot"></span><b id="lv-mini" class="num"></b><span class="spacer"></span><button class="btn danger" data-a="end">${icon('stop')}Akhiri live</button></div>
  </div>`;
}
// Hanya tulis ulang DOM bila isinya berubah, agar tombol tidak diganti di tengah klik saat live berjalan cepat.
const setHtml = (el, html) => { if (el && el._h !== html) { el.innerHTML = html; el._h = html; } };
function paintDash(root) {
  const c = C(), L = c.live; if (!L) return;
  const P = PLATFORMS[L.platform], acc = c.accounts[L.platform], q = id => root.querySelector(id);
  q('#lv-title').textContent = L.title;
  q('#lv-sub').textContent = `${P.name} · ${nName(L.niche)} · ${L.quality} · mulai ${clockAt(L, 0)}`;
  q('#lv-time').textContent = `${L.minute} / ${L.plannedMin} menit`;
  q('#lv-mini').textContent = `${L.minute} mnt · ${fInt(L.ccv)} menonton · +${fInt(L.follows)} follower`;
  q('#lv-q').textContent = `Energi ${Math.round(E.energy())}/100`;
  setHtml(q('#lv-kpis'), [kpi('Menonton sekarang', fInt(L.ccv)), kpi('Puncak', fInt(L.peak)), kpi('Penonton unik', fInt(L.unique)), kpi(`${P.followerLabel} baru`, '+' + fInt(L.follows)), kpi('Chat', fInt(L.chat)), kpi('Likes', fN(L.likes))].join(''));
  const ch = q('#lv-chart'); if (!lineChart(ch, L.series.slice(-180), { height: 170, floor: 0, yFmt: v => fN(v), tipFmt: v => `${fInt(v)} penonton`, xFmt: m => `menit ${m}`, area: true })) ch.innerHTML = '<div class="chart-empty">Grafik mulai setelah menit ke-2.</div>';
  setHtml(q('#lv-warn'), [L.lagUntil >= L.minute ? `<div class="msg warn" style="margin-top:8px">${icon('alert')}<span>Koneksi tidak stabil — penonton cepat pergi.</span></div>` : '', E.energy() < 20 ? `<div class="msg warn" style="margin-top:8px">${icon('alert')}<span>Energi rendah. Live berakhir otomatis jika energi habis.</span></div>` : ''].join(''));
  setHtml(q('#lv-feed'), L.feed.slice(0, 40).map(f => `<li class="f-${f.t}"><span class="subtle s num">${clockAt(L, f.m)}</span>${f.t === 'gift' ? icon('gift') : ''}${f.who ? `<b>${esc(f.who)}</b>` : ''}<span>${esc(f.text)}</span></li>`).join(''));
  setHtml(q('#lv-actions'), Object.entries(LIVE_ACTIONS).map(([k, a]) => { const last = L.actions[k], cd = last != null ? Math.max(0, a.cd - (L.minute - last)) : 0, dis = cd > 0 || (a.needsSupport && !L.supports.length); return `<button class="btn ${dis ? '' : 'primary-soft'}" data-act-live="${k}" ${dis ? 'disabled' : ''}>${esc(a.name)}${cd ? ` <span class="subtle s">(${cd} m)</span>` : a.needsSupport && !L.supports.length ? ' <span class="subtle s">(dukungan belum aktif)</span>' : ''}</button>`; }).join(''));
  const S = L.platform === 'tiktok' ? P.support.gifts : null;
  setHtml(q('#lv-money'), `${L.supports.length ? '' : `<div class="msg info" style="margin-bottom:8px">${icon('info')}<span>Fitur dukungan penonton belum aktif untuk akun ini.</span></div>`}
    <dl class="dl"><dt>Dukungan diterima</dt><dd class="num">${L.gifts.length}</dd>${S ? `<dt>Koin dari penonton</dt><dd class="num">${fInt(L.coins)} koin</dd><dt>Diamond kreator</dt><dd class="num">${fDia(L.diamonds)} diamond</dd>` : ''}
    <dt>Kotor (dibayar penonton)</dt><dd class="num">${rp(L.gross)}</dd><dt>Potongan platform</dt><dd class="num">−${rp(L.fee)}</dd><dt>Bersih kreator</dt><dd class="num">${rp(L.net)}</dd><dt>Biaya live (data & listrik)</dt><dd class="num">−${rp(L.cost)}</dd><dt><b>Hasil bersih sejauh ini</b></dt><dd class="num"><b class="${L.net - L.cost >= 0 ? 'pos' : 'neg'}">${rp(L.net - L.cost)}</b></dd></dl>
    <p class="subtle s" style="margin:6px 0 0">${S ? `Nilai koin ≠ uang diterima. Diamond masuk saldo diamond akun (${fDia(acc.wallet.diamonds)}), ditarik manual minimal ${rp(S.withdrawMin)}.` : 'Dukungan dicatat sebagai estimasi dan dibayar pada jadwal payout platform.'} Biaya dibayar tiap 30 menit dan saat live berakhir.</p>`);
  setHtml(q('#lv-gifts'), L.gifts.length ? `<table class="table"><thead><tr><th>Waktu</th><th>Dari</th><th>Dukungan</th><th class="r">${S ? 'Koin' : 'Nominal'}</th><th class="r">Jumlah</th><th class="r">Potongan</th><th class="r">Bersih kreator</th></tr></thead><tbody>${L.gifts.slice(-12).reverse().map(g => `<tr><td class="num">${clockAt(L, g.m)}</td><td>${esc(g.who)}</td><td>${esc(g.name)} <span class="subtle s">${esc(g.type)}</span></td><td class="r num">${g.coins ? `${fInt(g.coins)} (${rp(g.viewerIdr)})` : rp(g.gross)}</td><td class="r num">1</td><td class="r num">−${rp(g.fee)}</td><td class="r num">${rp(g.net)}${g.diamonds ? ` <span class="subtle s">${fDia(g.diamonds)} dia</span>` : ''}</td></tr>`).join('')}</tbody></table>` : `<div class="panel-b"><p class="subtle" style="margin:0">Belum ada dukungan pada sesi ini.</p></div>`);
}

export function live() {
  const c = C();
  if (!accounts().length) return { html: `<section class="panel"><div class="panel-b">${emptyBox('Belum ada akun kreator', 'Live membutuhkan akun platform.', '<a class="btn sm primary" href="#accounts">Buat akun</a>')}</div></section>` };
  if (c.live) {
    let root;
    return { html: dash(), update: () => { if (!C().live) { setTimeout(() => location.hash === '#live' && window.dispatchEvent(new HashChangeEvent('hashchange')), 0); return; } paintDash(root); },
      mount: el => { root = el; paintDash(el); el.addEventListener('click', e => {
        const a = e.target.closest('[data-act-live]'); if (a) { res(CR.liveAction(a.dataset.actLive)); paintDash(el); return; }
        if (e.target.closest('[data-a="end"]')) {
          const L = C().live;
          openDialog(`<div class="dlg-h"><h2>Akhiri live?</h2><button class="icon-btn" data-close aria-label="Tutup">${icon('x')}</button></div><div class="dlg-b"><p style="margin:0">Live sudah berjalan ${L.minute} menit dengan ${fInt(L.ccv)} penonton. Laporan sesi akan disimpan.</p></div><div class="dlg-f"><button class="btn" data-close>Lanjutkan live</button><button class="btn danger" id="endgo">${icon('stop')}Akhiri live</button></div>`, { onMount: d => d.querySelector('#endgo').addEventListener('click', () => { const r = CR.endLive(); d.close(); res(r); if (r.ok) setTimeout(() => reportDialog(r.data.id), 50); }) });
        }
      }); } };
  }
  let root;
  const paint = () => { root.innerHTML = `<div class="grid live-setup">${setupView()}<div class="stack" style="gap:16px">${scheduledList()}${reports()}</div></div>`; };
  return { keep: true, update: kind => { if (kind === 'change' && root && !root.contains(document.activeElement)) paint(); if (C().live) window.dispatchEvent(new HashChangeEvent('hashchange')); },
    html: '<div id="lv-root"></div>', mount: el => {
      root = el.querySelector('#lv-root'); paint();
      root.addEventListener('input', e => { const n = e.target.name; if (n && SET && n in SET) SET[n] = e.target.value; });
      root.addEventListener('change', e => { const n = e.target.name; if (n && SET && n in SET) SET[n] = e.target.value; });
      root.addEventListener('click', e => {
        const t = e.target, q = s => t.closest(s);
        if (q('[data-lp]')) { SET.platform = q('[data-lp]').dataset.lp; SET.niche = C().accounts[SET.platform]?.niche || SET.niche; if (!PLATFORMS[SET.platform].live.qualities.includes(SET.quality)) SET.quality = '720p'; return paint(); }
        if (q('[data-lq]')) { SET.quality = q('[data-lq]').dataset.lq; return paint(); }
        if (q('[data-ld]')) { SET.durMin = +q('[data-ld]').dataset.ld; return paint(); }
        if (q('[data-lw]')) { SET.when = q('[data-lw]').dataset.lw; return paint(); }
        if (q('[data-rep]')) return reportDialog(+q('[data-rep]').dataset.rep);
        if (q('[data-unlive]')) { if (confirm('Batalkan jadwal live ini?')) res(CR.cancelScheduledLive(+q('[data-unlive]').dataset.unlive)); return; }
        if (q('[data-golive]')) { const s = C().scheduledLives.find(x => x.id === +q('[data-golive]').dataset.golive); const r = CR.startLive({ ...s, scheduledId: s.id }); res(r); if (r.ok) window.dispatchEvent(new HashChangeEvent('hashchange')); return; }
        const a = q('[data-a]')?.dataset.a; if (!a) return;
        const err = m => { root.querySelector('#ls-err').innerHTML = `<div class="msg error">${icon('alert')}<span>${esc(m)}</span></div>`; };
        if (a === 'start') {
          if (!SET.title.trim()) return err('Judul live wajib diisi.');
          openDialog(`<div class="dlg-h"><h2>Mulai live sekarang?</h2><button class="icon-btn" data-close aria-label="Tutup">${icon('x')}</button></div><div class="dlg-b"><p style="margin:0"><b>${esc(SET.title)}</b> di ${pName(SET.platform)} · ${SET.quality} · rencana ${SET.durMin} menit.</p><p class="subtle s">Waktu simulasi akan berjalan per menit. Produksi konten berhenti sementara karena karakter sedang live.</p></div><div class="dlg-f"><button class="btn" data-close>Batal</button><button class="btn primary" id="lgo">${icon('broadcast')}Mulai live</button></div>`, { onMount: d => d.querySelector('#lgo').addEventListener('click', () => {
            const r = CR.startLive(SET); d.close(); if (!r.ok) return err(r.error); res(r); if (E.S.settings.paused) E.setPaused(false); SET = null; window.dispatchEvent(new HashChangeEvent('hashchange'));
          }) });
        }
        if (a === 'sched') {
          if (!SET.title.trim()) return err('Judul live wajib diisi.');
          const at = gOfDay(E.dayNow() + +SET.day) + +SET.time;
          const r = CR.scheduleLive({ ...SET, at }); if (!r.ok) return err(r.error); res(r); SET = null; paint();
        }
      });
    } };
}
