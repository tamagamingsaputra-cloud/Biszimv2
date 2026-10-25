// Production Queue · Published Content · detail konten
import { E, C, CR, PLATFORMS, STAGES, fN, fInt, fPct, fDur, fHours, fmtG, fmtDay, pIcon, pName, fmtName, nName, thumb, statusChip, primary, momChip, momentumOf, res, progress, stagePills, emptyBox, kpi, rp, rpShort, gOfDay, T } from './common.js';
import { icon, esc, openDialog, lineChart, sparkline } from '../../ui/ui.js';

const sum = (a, f) => a.reduce((s, x) => s + f(x), 0);
const conf = (msg, fn) => { if (confirm(msg)) fn(); };

export function queue() {
  const c = C(), eta = CR.queueEta(), wh = E.weeklyHours();
  const items = c.queue.map(id => c.contents.find(k => k.id === id)).filter(Boolean);
  const ready = c.contents.filter(k => k.status === 'ready'), sched = c.contents.filter(k => k.status === 'scheduled').sort((a, b) => a.scheduleG - b.scheduleG);
  const ended = c.contents.filter(k => ['cancelled', 'failed'].includes(k.status)).slice(-5).reverse();
  const card = (k, i) => {
    const pct = k.hoursTotal ? k.hoursDone / k.hoursTotal * 100 : 0, act = k.stages.find(s => s.done < s.hours), stg = act ? STAGES.find(s => s.key === act.key) : null;
    return `<article class="q-card"><div class="q-pri num" title="Prioritas">${i + 1}</div>${thumb(k, 56)}<div class="grow">
      <div class="row between wrap" style="gap:6px"><div><b>${esc(k.title)}</b><div class="subtle s">${pIcon(k.platform, 10)} ${pName(k.platform)} · ${fmtName(k.platform, k.format)} · ${nName(k.niche)}</div></div>${statusChip(k)}</div>
      <div class="row" style="gap:10px;margin-top:8px"><div class="grow">${progress(k)}</div><b class="num">${Math.floor(pct)}%</b></div>
      ${stagePills(k)}
      <dl class="q-meta"><div><dt>Tahap aktif</dt><dd>${stg ? `${stg.label} · ${fHours(act.done)}/${fHours(act.hours)}${act.outsourced ? ' (editor lepas)' : ''}` : '—'}</dd></div><div><dt>Estimasi selesai</dt><dd>${eta[k.id] ? fmtG(eta[k.id]) : 'Lebih dari 21 hari / terhambat'}</dd></div><div><dt>Biaya keluar</dt><dd class="num">${rp(k.costSpent)} / ${rp(k.costTotal)}</dd></div><div><dt>Jam</dt><dd class="num">${fHours(k.hoursDone)} / ${fHours(k.hoursTotal)}</dd></div></dl>
      ${k.wait ? `<div class="q-wait">${icon('clock')}<span>${esc(k.wait)}</span></div>` : ''}
      <div class="row wrap q-act"><button class="btn sm" data-mv="${k.id}" data-d="-1" ${i === 0 ? 'disabled' : ''} aria-label="Naikkan prioritas">${icon('up')}</button><button class="btn sm" data-mv="${k.id}" data-d="1" ${i === items.length - 1 ? 'disabled' : ''} aria-label="Turunkan prioritas">${icon('down')}</button>
        <button class="btn sm" data-pause="${k.id}">${icon(k.paused ? 'play' : 'pause')}${k.paused ? 'Lanjutkan' : 'Jeda'}</button><button class="btn sm" data-dup="${k.id}">${icon('copy')}Gandakan</button><button class="btn sm danger" data-cancel="${k.id}">${icon('x')}Batalkan</button></div>
    </div></article>`;
  };
  const html = `<div class="grid q-grid">
    <div class="stack" style="gap:16px">
    <section class="panel"><div class="panel-h"><h2>Sedang diproduksi & antrean</h2><span class="subtle s">${items.length} konten</span></div><div class="panel-b stack" style="gap:12px">
      ${items.length ? items.map(card).join('') : emptyBox('Antrean kosong', 'Konten yang mulai diproduksi muncul di sini dengan progres dari engine.', `<a class="btn sm primary" href="#create">${icon('edit')}Buat konten</a>`)}
    </div></section>
    <section class="panel"><div class="panel-h"><h2>Ready to Publish</h2><span class="subtle s">${ready.length}</span></div><div class="panel-b stack" style="gap:10px">
      ${ready.length ? ready.map(k => `<article class="q-card ready">${thumb(k, 56)}<div class="grow"><div class="row between wrap"><div><b>${esc(k.title)}</b><div class="subtle s">${pName(k.platform)} · ${fmtName(k.platform, k.format)} · selesai ${fmtG(k.readyG, true)}</div></div>${statusChip(k)}</div>
        <div class="row wrap q-act"><button class="btn primary" data-review="${k.id}">${icon('send')}Review & terbitkan</button><button class="btn sm danger" data-cancel="${k.id}">Batalkan</button></div></div></article>`).join('') : '<p class="subtle" style="margin:0">Belum ada konten yang selesai diproduksi.</p>'}
    </div></section>
    <section class="panel"><div class="panel-h"><h2>Terjadwal</h2></div><div class="panel-b stack" style="gap:10px">
      ${sched.length ? sched.map(k => `<article class="q-card">${thumb(k, 44)}<div class="grow"><b>${esc(k.title)}</b><div class="subtle s">${pName(k.platform)} · terbit ${fmtG(k.scheduleG)}${k.premiere ? ' · Premiere' : ''}</div><div class="row wrap q-act"><button class="btn sm" data-pubnow="${k.id}">Terbitkan sekarang</button><button class="btn sm" data-unsched="${k.id}">Batalkan jadwal</button></div></div></article>`).join('') : '<p class="subtle" style="margin:0">Tidak ada konten terjadwal.</p>'}
    </div></section>
    ${ended.length ? `<section class="panel"><div class="panel-h"><h2>Dibatalkan / gagal</h2></div><div class="table-wrap"><table class="table"><tbody>${ended.map(k => `<tr><td>${esc(k.title)}<div class="subtle s">${pName(k.platform)} · ${k.failReason ? esc(k.failReason) : 'dibatalkan'}</div></td><td class="r num">${rp(k.costSpent)} hilang</td><td class="r"><button class="btn sm" data-dup="${k.id}">${icon('copy')}Gandakan</button></td></tr>`).join('')}</tbody></table></div></section>` : ''}
    </div>
    <aside class="stack" style="gap:16px"><section class="panel"><div class="panel-h"><h2>Kapasitas kerja</h2></div><div class="panel-b stack" style="gap:8px">
      <dl class="dl"><dt>Batas kreator</dt><dd>${c.settings.dailyHours} jam/hari</dd><dt>Dipakai hari ini</dt><dd class="num">${fHours(c.hoursToday)}</dd><dt>Waktu luang minggu ini</dt><dd class="num">${fHours(wh.free)}</dd><dt>Energi</dt><dd class="num">${Math.round(E.energy())}/100</dd></dl>
      <p class="subtle s" style="margin:0">Karakter mengerjakan satu konten teratas yang bisa dikerjakan per 30 menit, di luar tidur (22.00–06.00), sekolah, dan kerja. Editor lepas bekerja paralel 08.00–20.00. Urutan antrean = prioritas.</p>
      <a class="btn sm" href="#gear">Ubah batas jam</a></div></section></aside>
  </div>`;
  return { html, mount: el => el.addEventListener('click', e => {
    const t = e.target, q = s => t.closest(s);
    if (q('[data-mv]')) return res(CR.move(+q('[data-mv]').dataset.mv, +q('[data-mv]').dataset.d));
    if (q('[data-pause]')) return res(CR.togglePause(+q('[data-pause]').dataset.pause));
    if (q('[data-dup]')) return res(CR.duplicate(+q('[data-dup]').dataset.dup), x => x.ok && toast2());
    if (q('[data-cancel]')) { const k = C().contents.find(x => x.id === +q('[data-cancel]').dataset.cancel); return conf(`Batalkan "${k.title}"?${k.costSpent ? ` Biaya ${rp(k.costSpent)} yang sudah keluar tidak kembali.` : ''}`, () => res(CR.cancel(k.id))); }
    if (q('[data-review]')) return reviewDialog(+q('[data-review]').dataset.review);
    if (q('[data-pubnow]')) return conf('Terbitkan sekarang?', () => res(CR.publish(+q('[data-pubnow]').dataset.pubnow)));
    if (q('[data-unsched]')) return res(CR.unschedule(+q('[data-unsched]').dataset.unsched));
  }) };
}
const toast2 = () => {};

const QLAB = { idea: ['Mutu ide', 'Riset, storytelling, kecocokan sudut ide'], prod: ['Mutu produksi', 'Skill rekam & edit, alat, kualitas, anggaran, energi'], pack: ['Kemasan', 'Judul, caption, thumbnail, skill marketing'], fit: ['Kecocokan', 'Topik vs platform & topik akun'], durFit: ['Kecocokan durasi', 'Dekat rentang nyaman format'] };
export function qualityBars(q) {
  return `<div class="qbars">${Object.entries(QLAB).map(([k, [l, d]]) => { const v = q[k] ?? 0; return `<div title="${esc(d)}"><div class="row between s"><span>${l}</span><span class="num">${v.toLocaleString("id-ID", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</span></div><div class="bar ${v >= 1 ? 'green' : v < 0.6 ? 'red' : ''}"><i style="width:${Math.min(100, v / 1.4 * 100)}%"></i></div></div>`; }).join('')}</div><p class="subtle s" style="margin:6px 0 0">1,00 = setara rata-rata format ini. Skor mutu tidak menjamin tayangan; distribusi juga dipengaruhi jam terbit, tren, persaingan, dan keberuntungan.</p>`;
}

function reviewDialog(id) {
  const k = C().contents.find(x => x.id === id), f = PLATFORMS[k.platform].formats[k.format], d0 = E.dayNow();
  const warn = [k.packaging === 'clickbait' && k.q.overall < 0.75 ? 'Judul clickbait dengan mutu isi rendah berisiko dinilai menyesatkan (reputasi turun).' : null, k.music === 'unlicensed' ? 'Lagu tanpa lisensi: risiko klaim hak cipta, audio dibisukan, atau strike.' : null, k.sponsorContract && !k.disclosure ? 'Konten bersponsor tanpa label.' : null, k.q.energyAvg != null && k.q.energyAvg < 40 ? `Dikerjakan saat energi rendah (rata-rata ${Math.round(k.q.energyAvg)}) — mutu produksi turun.` : null].filter(Boolean);
  openDialog(`<div class="dlg-h"><h2>Review sebelum terbit</h2><button class="icon-btn" data-close aria-label="Tutup">${icon('x')}</button></div><div class="dlg-b stack">
    <div class="row" style="gap:12px;align-items:flex-start">${thumb(k, 72)}<div><b>${esc(k.title)}</b><div class="subtle s">${pName(k.platform)} · ${f.name} · ${nName(k.niche)}</div>${k.caption ? `<div class="subtle s" style="margin-top:4px">${esc(k.caption.slice(0, 140))}</div>` : ''}</div></div>
    ${qualityBars(k.q)}
    ${k.q.textNotes?.length ? `<div class="msg info">${icon('info')}<span>${k.q.textNotes.map(esc).join('<br>')}</span></div>` : ''}
    ${warn.length ? `<div class="msg warn">${icon('alert')}<span>${warn.map(esc).join('<br>')}</span></div>` : ''}
    <div class="divider"></div>
    <div class="row wrap" style="gap:10px"><label class="field"><span>Kapan terbit</span><select class="input" id="rv-when"><option value="now">Sekarang (${E.timeLabel()})</option>${f.schedule ? Array.from({ length: 14 }, (_, i) => `<option value="${i}">${i === 0 ? 'Hari ini' : i === 1 ? 'Besok' : `+${i} hari`} (H${d0 + i + 1})</option>`).join('') : ''}</select></label>
      ${f.schedule ? `<label class="field"><span>Jam</span><select class="input" id="rv-time">${Array.from({ length: 48 }, (_, i) => `<option value="${i}" ${i === 38 ? 'selected' : ''}>${String(Math.floor(i / 2)).padStart(2, '0')}.${i % 2 ? '30' : '00'}</option>`).join('')}</select></label>` : ''}</div>
    ${f.premiere ? `<label class="check"><input type="checkbox" id="rv-prem"><span>Sebagai Premiere (hanya untuk jadwal)</span></label>` : ''}
    <div id="rv-err"></div></div>
    <div class="dlg-f"><button class="btn" data-close>Tutup</button><button class="btn primary" id="rv-go">${icon('send')}Terbitkan</button></div>`, { onMount: d => {
    const sel = d.querySelector('#rv-when'), go = d.querySelector('#rv-go');
    sel.addEventListener('change', () => { go.innerHTML = `${icon('send')}${sel.value === 'now' ? 'Terbitkan' : 'Jadwalkan'}`; });
    go.addEventListener('click', () => {
      let at = null; if (sel.value !== 'now') at = gOfDay(d0 + +sel.value) + +d.querySelector('#rv-time').value;
      if (at != null && at <= E.S.clock.g) { d.querySelector('#rv-err').innerHTML = `<div class="msg error">${icon('alert')}<span>Waktu jadwal sudah lewat.</span></div>`; return; }
      const r = CR.publish(id, at, { premiere: d.querySelector('#rv-prem')?.checked }); d.close(); res(r);
    });
  } });
}

// ————————————————————————— Published Content —————————————————————————
const PF = { p: 'all', f: 'all', sort: 'new' };
export function published() {
  const c = C();
  let list = c.contents.filter(k => k.status === 'published');
  const pids = [...new Set(list.map(k => k.platform))];
  if (PF.p !== 'all') list = list.filter(k => k.platform === PF.p);
  const fmts = [...new Set(list.map(k => k.format))]; if (PF.f !== 'all') list = list.filter(k => k.format === PF.f);
  const last = k => k.hist.length ? k.hist[k.hist.length - 1][1] : 0;
  list.sort(PF.sort === 'top' ? (a, b) => primary(b)[1] - primary(a)[1] : PF.sort === 'hot' ? (a, b) => last(b) - last(a) : (a, b) => b.publishedG - a.publishedG);
  const chips = (key, opts) => `<div class="seg" role="group">${opts.map(([v, l]) => `<button class="${PF[key] === v ? 'on' : ''}" data-pf="${key}" data-v="${v}">${l}</button>`).join('')}</div>`;
  const flags = k => [k.flags.claimed && '<span class="chip neg">Klaim hak cipta</span>', k.flags.muted && '<span class="chip neg">Audio dibisukan</span>', k.flags.misleading && '<span class="chip neg">Dinilai menyesatkan</span>', k.flags.strike && '<span class="chip neg">Strike</span>', k.sponsorContract && '<span class="chip">Bersponsor</span>', k.expired && '<span class="chip">Kedaluwarsa</span>', k.premiere && '<span class="chip">Premiere</span>'].filter(Boolean).join(' ');
  const html = `<section class="panel"><div class="panel-h wrap" style="gap:10px"><h2>Published Content</h2><div class="row wrap" style="gap:8px">${chips('p', [['all', 'Semua'], ...pids.map(p => [p, pName(p)])])}${PF.p !== 'all' ? chips('f', [['all', 'Semua format'], ...fmts.map(f => [f, fmtName(PF.p, f)])]) : ''}${chips('sort', [['new', 'Terbaru'], ['top', 'Terbanyak'], ['hot', 'Ramai kemarin']])}</div></div>
    ${list.length ? `<div class="table-wrap"><table class="table pub-table"><thead><tr><th>Konten</th><th class="r">Metrik utama</th><th class="r">Kemarin</th><th>Arah</th><th class="hide-m">Tren harian</th><th class="r hide-m">Estimasi pendapatan</th></tr></thead><tbody>
      ${list.slice(0, 80).map(k => { const [l, v] = primary(k); return `<tr data-go="${k.id}" tabindex="0"><td><div class="row" style="gap:10px">${thumb(k, 44)}<div class="clip"><a href="#content/${k.id}"><b>${esc(k.title)}</b></a><div class="subtle s">${pName(k.platform)} · ${fmtName(k.platform, k.format)} · ${fmtG(k.publishedG, true)}</div>${flags(k) ? `<div class="row wrap" style="gap:4px;margin-top:3px">${flags(k)}</div>` : ''}</div></div></td><td class="r num">${fInt(v)}<div class="subtle s">${l}</div></td><td class="r num">${fInt(last(k))}</td><td>${momChip(momentumOf(k))}</td><td class="hide-m">${sparkline(k.hist.slice(-21).map(h => [h[0], h[1]]), 90, 26)}</td><td class="r num hide-m">${k.m.rev ? rp(k.m.rev) : '—'}</td></tr>`; }).join('')}</tbody></table></div>
      <p class="subtle s" style="margin:8px 14px 12px">“Kemarin” = tambahan hari simulasi terakhir yang tersimpan. Views/plays dan reach adalah metrik berbeda; lihat definisi di halaman platform.</p>`
    : `<div class="panel-b">${emptyBox('Belum ada konten terbit', 'Konten yang sudah diterbitkan tampil di sini beserta performanya.', `<a class="btn sm primary" href="#create">${icon('edit')}Buat konten</a>`)}</div>`}</section>`;
  return { html, mount: el => el.addEventListener('click', e => {
    const b = e.target.closest('[data-pf]'); if (b) { PF[b.dataset.pf] = b.dataset.v; if (b.dataset.pf === 'p') PF.f = 'all'; E.emit('change'); return; }
    const r = e.target.closest('[data-go]'); if (r && !e.target.closest('a')) location.hash = `#content/${r.dataset.go}`;
  }) };
}

// ————————————————————————— Detail konten —————————————————————————
const SRC = { youtube: { followers: 'Subscriber & notifikasi', discovery: 'Beranda / rekomendasi', search: 'Pencarian', resurface: 'Direkomendasikan ulang', collab: 'Kolaborasi' }, tiktok: { followers: 'Following', discovery: 'For You (simulasi)', search: 'Pencarian', resurface: 'Direkomendasikan ulang', collab: 'Kolaborasi' }, instagram: { followers: 'Follower (feed/story)', discovery: 'Explore / Reels', search: 'Pencarian & hashtag', resurface: 'Direkomendasikan ulang', collab: 'Kolaborasi' } };
export function metricCards(k) {
  const m = k.m, f = PLATFORMS[k.platform].formats[k.format], v = Math.max(1, m.views), P = PLATFORMS[k.platform];
  const avg = m.watchSec / v, gained = m.follows;
  if (k.platform === 'youtube' && f.kind === 'video') return [kpi('Views', fInt(m.views)), kpi('Watch time', `${fN(m.watchSec / 3600)} jam`), kpi('Average view duration', fDur(avg)), kpi('Retention rata-rata', k.dur ? fPct(avg / k.dur) : '—'), kpi('Subscribers gained', fInt(gained)), kpi('Estimasi pendapatan', rp(m.rev), m.rev ? 'belum final' : k.flags.claimed ? 'dialihkan (klaim)' : 'program belum aktif')].join('');
  if (k.platform === 'tiktok' && f.kind === 'video') return [kpi('Video views', fInt(m.views)), kpi('Completion rate', fPct(m.completes / v)), kpi('Average watch time', fDur(avg)), kpi('Shares', fInt(m.shares)), kpi('Followers gained', fInt(gained)), kpi('Likes · komentar', `${fN(m.likes)} · ${fN(m.comments)}`)].join('');
  if (k.platform === 'instagram' && k.format !== 'story') return [kpi('Reach', fInt(m.reach)), kpi('Impressions', fInt(m.impr)), ...(k.format === 'reels' ? [kpi('Plays', fInt(m.views))] : []), kpi('Likes', fInt(m.likes)), kpi('Saves', fInt(m.saves)), kpi('Shares', fInt(m.shares)), kpi('Profile visits', fInt(m.pv)), kpi('Followers gained', fInt(gained))].join('');
  if (f.viewRule === 'story') return [kpi('Penonton story', fInt(m.views)), kpi('Reach', fInt(m.reach)), kpi('Balasan / reaksi', fInt(m.likes)), kpi('Status', k.expired ? 'Kedaluwarsa' : 'Aktif 24 jam')].join('');
  return [kpi(f.viewRule === 'impr' ? 'Impresi' : 'Views', fInt(f.viewRule === 'impr' ? m.impr : m.views)), kpi('Reach', fInt(m.reach)), kpi('Likes', fInt(m.likes)), kpi('Komentar', fInt(m.comments)), kpi('Shares', fInt(m.shares)), kpi(`${P.followerLabel} baru`, fInt(gained))].join('');
}

export function contentDetail({ route }) {
  const c = C(), k = c.contents.find(x => x.id === +route[1]);
  if (!k) return { html: emptyBox('Konten tidak ditemukan', '', '<a class="btn sm" href="#published">Kembali</a>') };
  if (k.status !== 'published') return { html: `<a class="btn sm ghost" href="#queue">Production Queue</a><section class="panel" style="margin-top:12px"><div class="panel-b">${emptyBox(k.title, `Status: ${statusChip(k)} — analytics tersedia setelah terbit.`)}</div></section>` };
  const P = PLATFORMS[k.platform], f = P.formats[k.format], [pl, pv] = primary(k);
  const src = k.m.src, srcT = Math.max(1, sum(Object.values(src), x => x)), SL = SRC[k.platform];
  const peers = c.contents.filter(x => x.status === 'published' && x.platform === k.platform && x.format === k.format && x.id !== k.id);
  const pvals = peers.map(x => primary(x)[1]).sort((a, b) => a - b), avgP = pvals.length ? sum(pvals, x => x) / pvals.length : 0, med = pvals.length ? pvals[Math.floor(pvals.length / 2)] : 0;
  const rank = pvals.filter(x => x > pv).length + 1;
  const age = E.dayNow() - (Math.floor(k.publishedG / T) - 14);
  const peerAt = peers.filter(x => x.hist.length >= Math.min(age, 60)).map(x => sum(x.hist.slice(0, Math.min(age, 60)), h => h[1])).filter(x => x > 0);
  const flagsMsg = [k.flags.claimed && 'Klaim hak cipta (simulasi): pendapatan iklan video ini dialihkan ke pemilik lagu.', k.flags.muted && 'Audio dibisukan karena lagu tanpa lisensi — retensi turun.', k.flags.misleading && 'Banyak penonton menilai judul menyesatkan: retensi & reputasi turun.', k.flags.strike && 'Konten ini menyebabkan strike pada akun.', k.flags.disclosure && 'Konten bersponsor tanpa label kerja sama.', k.expired && 'Story sudah kedaluwarsa (24 jam).'].filter(Boolean);
  const html = `<a class="btn sm ghost" href="#published">${icon('arrowR', 'style="transform:rotate(180deg)"')}Published Content</a>
  <section class="panel" style="margin-top:12px"><div class="panel-h wrap" style="gap:10px"><div class="row" style="gap:12px;align-items:flex-start">${thumb(k, 80)}<div><h2 style="margin:0">${esc(k.title)}</h2><div class="subtle s">${pIcon(k.platform, 10)} ${pName(k.platform)} · ${f.name} · ${nName(k.niche)} · terbit ${fmtG(k.publishedG)}${k.premiere ? ' · Premiere' : ''}</div><div style="margin-top:6px">${momChip(momentumOf(k))}</div></div></div><button class="btn sm" data-dup="${k.id}">${icon('copy')}Gandakan konsep</button></div>
    <div class="panel-b">${flagsMsg.length ? `<div class="msg warn" style="margin-bottom:12px">${icon('alert')}<span>${flagsMsg.map(esc).join('<br>')}</span></div>` : ''}<div class="kpis">${metricCards(k)}</div>
    <h3 style="margin:16px 0 6px">${pl} per hari</h3><div class="chart" id="ct-chart"></div><p class="subtle s" style="margin:6px 0 0">Data harian tersimpan (hari berjalan belum masuk grafik). Tayangan bisa naik lagi bila konten direkomendasikan ulang atau dicari.</p></div></section>
  <div class="grid g-2" style="margin-top:16px">
    <section class="panel"><div class="panel-h"><h2>Sumber jangkauan</h2></div><div class="panel-b stack" style="gap:8px">${Object.entries(src).filter(([, v]) => v > 0).sort((a, b) => b[1] - a[1]).map(([s, v]) => `<div><div class="row between s"><span>${SL[s] || s}</span><span class="num">${fPct(v / srcT, 0)}</span></div><div class="bar"><i style="width:${v / srcT * 100}%"></i></div></div>`).join('') || '<p class="subtle" style="margin:0">Belum ada data.</p>'}</div></section>
    <section class="panel"><div class="panel-h"><h2>Skor mutu akhir</h2></div><div class="panel-b">${k.q ? qualityBars(k.q) : '—'}</div></section>
    <section class="panel"><div class="panel-h"><h2>Dibanding konten serupa</h2><span class="subtle s">${pName(k.platform)} ${f.name}</span></div><div class="panel-b">${pvals.length ? `<dl class="dl"><dt>Konten pembanding</dt><dd>${pvals.length}</dd><dt>Rata-rata ${pl.toLowerCase()}</dt><dd class="num">${fInt(avgP)}</dd><dt>Median</dt><dd class="num">${fInt(med)}</dd><dt>Konten ini</dt><dd class="num">${fInt(pv)} (${avgP ? `${pv >= avgP ? '+' : ''}${Math.round((pv / avgP - 1) * 100)}% dari rata-rata` : '—'})</dd><dt>Peringkat</dt><dd>${rank} dari ${pvals.length + 1}</dd>${peerAt.length ? `<dt>Rata-rata pembanding di umur ${Math.min(age, 60)} hari</dt><dd class="num">${fInt(sum(peerAt, x => x) / peerAt.length)}</dd>` : ''}</dl>` : '<p class="subtle" style="margin:0">Belum ada konten lain dengan platform & format yang sama untuk dibandingkan.</p>'}</div></section>
    <section class="panel"><div class="panel-h"><h2>Pendapatan konten</h2></div><div class="panel-b"><dl class="dl"><dt>Estimasi iklan / program</dt><dd class="num">${rp(k.m.rev)}</dd>${k.affiliate ? `<dt>Penjualan affiliate</dt><dd class="num">${fInt(k.m.affSales)} item · komisi ${rp(k.m.affComm)}</dd>` : ''}<dt>Biaya produksi</dt><dd class="num">${rp(k.costSpent)}</dd><dt>Selisih (estimasi)</dt><dd class="num ${k.m.rev + (k.m.affComm || 0) - k.costSpent >= 0 ? 'pos' : 'neg'}">${rp(k.m.rev + (k.m.affComm || 0) - k.costSpent)}</dd></dl><p class="subtle s" style="margin:6px 0 0">Estimasi belum final; jumlah diterima muncul di Monetization setelah finalisasi & pembayaran.${k.sponsorContract ? ' Fee sponsor dicatat per kontrak.' : ''}</p></div></section>
  </div>`;
  return { html, mount: el => {
    const ch = el.querySelector('#ct-chart'), ser = k.hist.map(h => [h[0], h[1]]);
    if (!lineChart(ch, ser, { height: 200, floor: 0, yFmt: v => fN(v), tipFmt: v => fInt(v), xFmt: (d, l) => l ? fmtDay(d) : `H${d + 1}` })) ch.innerHTML = '<div class="chart-empty">Grafik muncul setelah 2 hari data tersimpan.</div>';
    el.addEventListener('click', e => { const d = e.target.closest('[data-dup]'); if (d) res(CR.duplicate(k.id), x => { if (x.ok) location.hash = `#create/draft/${x.data.id}`; }); });
  } };
}
