// Audience & Analytics (per platform, data tersimpan saja) · Equipment & Creator Skills
import { E, C, CR, PLATFORMS, fN, fInt, fPct, fDur, fmtG, fmtDay, pIcon, pName, fmtName, nName, thumb, primary, res, emptyBox, kpi, rp, rpShort, accounts, T } from './common.js';
import { icon, esc, lineChart, barChart, openDialog } from '../../ui/ui.js';
import { EQUIPMENT, CREATOR_SKILLS } from '../../data/creator-platforms.js';
import { tierCard } from './overview.js';

const sum = (a, f) => a.reduce((s, x) => s + f(x), 0);
let AP = null, AD = 28;
const SRCL = { youtube: { followers: 'Subscriber & notifikasi', discovery: 'Beranda / rekomendasi', search: 'Pencarian', resurface: 'Rekomendasi ulang', collab: 'Kolaborasi' }, tiktok: { followers: 'Following', discovery: 'For You (simulasi)', search: 'Pencarian', resurface: 'Rekomendasi ulang', collab: 'Kolaborasi' }, instagram: { followers: 'Follower', discovery: 'Explore / Reels', search: 'Pencarian & hashtag', resurface: 'Rekomendasi ulang', collab: 'Kolaborasi' } };

export function analytics() {
  const c = C(), accs = accounts();
  if (!accs.length) return { html: `<section class="panel"><div class="panel-b">${emptyBox('Belum ada data', 'Analytics muncul setelah akun dibuat dan konten terbit.', '<a class="btn sm primary" href="#accounts">Buat akun</a>')}</div></section>` };
  if (!AP || !c.accounts[AP]) AP = accs[0].id;
  const acc = c.accounts[AP], P = PLATFORMS[AP], t = CR.totals(AP, AD), d0 = E.dayNow();
  const inPeriod = c.contents.filter(k => k.status === 'published' && k.platform === AP && Math.floor(k.publishedG / T) - 14 > d0 - AD);
  const vids = inPeriod.filter(k => P.formats[k.format].kind === 'video');
  const v = Math.max(1, t.views), net = t.gained - t.lost;
  const lives = c.lives.filter(r => r.platform === AP && Math.floor(r.startG / T) - 14 > d0 - AD);
  let cards;
  if (AP === 'youtube') {
    const longs = inPeriod.filter(k => k.format === 'long' && k.m.views > 0);
    const ret = longs.length ? sum(longs, k => k.m.watchSec / k.m.views / k.dur * k.m.views) / sum(longs, k => k.m.views) : null;
    cards = [kpi('Views', fInt(t.views)), kpi('Watch time', `${fN(t.watchSec / 3600)} jam`, `Video panjang ${fN(t.watchLong / 3600)} jam`), kpi('Average view duration', fDur(t.watchSec / v)), kpi('Retention rata-rata', ret != null ? fPct(ret) : '—', 'video panjang yang terbit di periode ini'), kpi('Subscriber bersih', `<span class="${net >= 0 ? 'pos' : 'neg'}">${net >= 0 ? '+' : ''}${fInt(net)}</span>`, `+${fInt(t.gained)} · −${fInt(t.lost)}`), kpi('Estimasi pendapatan', rp(t.rev), 'belum final')];
  } else if (AP === 'tiktok') {
    const cv = sum(vids, k => k.m.views);
    cards = [kpi('Video views', fInt(t.views)), kpi('Completion rate', cv ? fPct(sum(vids, k => k.m.completes) / cv) : '—', 'video yang terbit di periode ini'), kpi('Average watch time', fDur(t.watchSec / v)), kpi('Shares', fInt(t.shares)), kpi('Follower bersih', `<span class="${net >= 0 ? 'pos' : 'neg'}">${net >= 0 ? '+' : ''}${fInt(net)}</span>`, `+${fInt(t.gained)} · −${fInt(t.lost)}`), kpi('LIVE', lives.length ? `${lives.length} sesi` : '—', lives.length ? `Puncak rata-rata ${fInt(sum(lives, r => r.peak) / lives.length)} · ${fN(sum(lives, r => r.diamonds))} diamond` : 'Belum ada live di periode ini')];
  } else {
    cards = [kpi('Reach', fInt(t.reach)), kpi('Impressions', fInt(t.impr)), kpi('Likes', fInt(t.likes)), kpi('Saves', fInt(t.saves)), kpi('Shares', fInt(t.shares)), kpi('Profile visits', fInt(t.pv)), kpi('Follower bersih', `<span class="${net >= 0 ? 'pos' : 'neg'}">${net >= 0 ? '+' : ''}${fInt(net)}</span>`, `+${fInt(t.gained)} · −${fInt(t.lost)}`)];
  }
  const allPub = c.contents.filter(k => k.status === 'published' && k.platform === AP);
  const src = {}; for (const k of allPub) for (const [s, x] of Object.entries(k.m.src)) src[s] = (src[s] || 0) + x;
  const srcT = Math.max(1, sum(Object.values(src), x => x));
  const byFmt = {}; for (const k of allPub) { const o = (byFmt[k.format] ||= { n: 0, tot: 0, best: 0 }); const p = primary(k)[1]; o.n++; o.tot += p; o.best = Math.max(o.best, p); }
  const byNiche = {}; for (const k of allPub) { const o = (byNiche[k.niche] ||= { n: 0, tot: 0 }); o.n++; o.tot += primary(k)[1]; }
  const top = inPeriod.slice().sort((a, b) => primary(b)[1] - primary(a)[1]).slice(0, 10);
  const mainKey = AP === 'instagram' ? 'reach' : 'views', mainL = AP === 'instagram' ? 'Reach' : 'Views';
  const defs = Object.values(P.metricDefs).map(x => { const [k, ...r] = x.split(':'); return `<dt>${esc(k)}</dt><dd>${esc(r.join(':').trim())}</dd>`; }).join('');
  const html = `<div class="row wrap between" style="gap:10px;margin-bottom:14px"><div class="seg">${accs.map(a => `<button class="${a.id === AP ? 'on' : ''}" data-ap="${a.id}">${pName(a.id)}</button>`).join('')}</div><div class="seg">${[7, 28, 90].map(d => `<button class="${AD === d ? 'on' : ''}" data-ad="${d}">${d} hari</button>`).join('')}</div></div>
  <div class="kpis st-kpis">${cards.join('')}</div>
  <div class="grid g-2" style="margin-top:16px">
    <section class="panel st-wide"><div class="panel-h"><h2>${mainL} harian</h2><span class="subtle s">${pName(AP)} · data tersimpan</span></div><div class="panel-b"><div class="chart" id="an-main"></div></div></section>
    <section class="panel"><div class="panel-h"><h2>${P.followerLabel}</h2></div><div class="panel-b"><div class="chart" id="an-fol"></div></div></section>
    <section class="panel"><div class="panel-h"><h2>Pertumbuhan bersih harian</h2><span class="subtle s">baru − berhenti</span></div><div class="panel-b"><div class="chart" id="an-net"></div></div></section>
    <section class="panel"><div class="panel-h"><h2>Sumber pertumbuhan</h2><span class="subtle s">semua konten</span></div><div class="panel-b stack" style="gap:8px">${Object.entries(src).filter(([, x]) => x > 0).sort((a, b) => b[1] - a[1]).map(([s, x]) => `<div><div class="row between s"><span>${SRCL[AP][s] || s}</span><span class="num">${fPct(x / srcT, 0)} · ${fN(x)}</span></div><div class="bar"><i style="width:${x / srcT * 100}%"></i></div></div>`).join('') || '<p class="subtle" style="margin:0">Belum ada data.</p>'}</div></section>
    <section class="panel"><div class="panel-h"><h2>Perbandingan format</h2></div>${Object.keys(byFmt).length ? `<div class="table-wrap"><table class="table"><thead><tr><th>Format</th><th class="r">Konten</th><th class="r">Rata-rata</th><th class="r">Terbaik</th></tr></thead><tbody>${Object.entries(byFmt).map(([f, o]) => `<tr><td>${fmtName(AP, f)}</td><td class="r num">${o.n}</td><td class="r num">${fInt(o.tot / o.n)}</td><td class="r num">${fInt(o.best)}</td></tr>`).join('')}</tbody></table></div><p class="subtle s" style="margin:8px 14px 12px">Metrik utama: views/plays, atau reach untuk feed Instagram. Format berbeda punya pola tayangan berbeda.</p>` : `<div class="panel-b"><p class="subtle" style="margin:0">Belum ada konten terbit.</p></div>`}</section>
    <section class="panel"><div class="panel-h"><h2>Perbandingan topik</h2></div>${Object.keys(byNiche).length ? `<div class="table-wrap"><table class="table"><thead><tr><th>Topik</th><th class="r">Konten</th><th class="r">Rata-rata</th></tr></thead><tbody>${Object.entries(byNiche).sort((a, b) => b[1].tot / b[1].n - a[1].tot / a[1].n).map(([n, o]) => `<tr><td>${nName(n)}${n === acc.niche ? ' <span class="chip">topik akun</span>' : ''}</td><td class="r num">${o.n}</td><td class="r num">${fInt(o.tot / o.n)}</td></tr>`).join('')}</tbody></table></div>` : `<div class="panel-b"><p class="subtle" style="margin:0">Belum ada konten terbit.</p></div>`}</section>
    <section class="panel st-wide"><div class="panel-h"><h2>Performa per konten</h2><span class="subtle s">terbit dalam ${AD} hari</span></div>${top.length ? `<div class="table-wrap"><table class="table"><thead><tr><th>Konten</th><th class="r">Metrik utama</th>${AP === 'instagram' ? '<th class="r">Saves</th><th class="r">Profile visits</th>' : '<th class="r">Avg. ditonton</th><th class="r">Shares</th>'}<th class="r">${P.followerShort} baru</th></tr></thead><tbody>${top.map(k => { const [l, pv] = primary(k); return `<tr><td><a class="row" style="gap:10px" href="#content/${k.id}">${thumb(k, 36)}<span class="clip">${esc(k.title)}<br><span class="subtle s">${fmtName(k.platform, k.format)} · ${fmtG(k.publishedG, true)}</span></span></a></td><td class="r num">${fInt(pv)} <span class="subtle s">${l}</span></td>${AP === 'instagram' ? `<td class="r num">${fInt(k.m.saves)}</td><td class="r num">${fInt(k.m.pv)}</td>` : `<td class="r num">${k.m.views ? fDur(k.m.watchSec / k.m.views) : '—'}</td><td class="r num">${fInt(k.m.shares)}</td>`}<td class="r num">${fInt(k.m.follows)}</td></tr>`; }).join('')}</tbody></table></div>` : `<div class="panel-b">${emptyBox('Belum ada konten di periode ini', 'Perpanjang periode atau terbitkan konten.')}</div>`}</section>
    <section class="panel st-wide"><div class="panel-h"><h2>Definisi metrik ${P.name}</h2></div><div class="panel-b"><dl class="dl defs">${defs}</dl><p class="subtle s" style="margin:8px 0 0">Jangan membandingkan angka antarplatform secara langsung: views YouTube dihitung setelah klik/putar, views TikTok termasuk putar ulang di feed, reach Instagram = akun unik.</p></div></section>
  </div>`;
  return { html, mount: el => {
    const xf = (d, l) => l ? fmtDay(d) : `H${d + 1}`;
    const draw = (id, s, o) => { const ch = el.querySelector(id); if (!lineChart(ch, s, { height: 190, floor: 0, yFmt: v => fN(v), tipFmt: v => fInt(v), xFmt: xf, ...o })) ch.innerHTML = '<div class="chart-empty">Grafik muncul setelah 2 hari data tersimpan.</div>'; };
    draw('#an-main', CR.accountSeries(AP, mainKey, AD), {});
    draw('#an-fol', CR.accountSeries(AP, 'followers', AD).map(([d, v]) => [d, Math.floor(v)]), {});
    const g = CR.accountSeries(AP, 'gained', Math.min(AD, 21)), l = CR.accountSeries(AP, 'lost', Math.min(AD, 21));
    const nb = el.querySelector('#an-net'); if (!g.some(x => Math.round(x[1]) > 0) && !l.some(x => Math.round(x[1]) > 0)) nb.innerHTML = '<div class="chart-empty">Belum ada perubahan jumlah pengikut di periode ini.</div>'; else if (!barChart(nb, g.map((x, i) => ({ label: `H${x[0] + 1}`, value: Math.round(x[1] - (l[i]?.[1] || 0)) })), { height: 170, fmt: v => fN(v) })) nb.innerHTML = '<div class="chart-empty">Belum ada data harian.</div>';
    el.addEventListener('click', e => { const a = e.target.closest('[data-ap]'), d = e.target.closest('[data-ad]'); if (a) { AP = a.dataset.ap; E.emit('change'); } if (d) { AD = +d.dataset.ad; E.emit('change'); } });
  } };
}

// ————————————————————————— Equipment & Creator Skills —————————————————————————
function effects(it) {
  const o = [];
  if (it.rec) o.push(`rekam ×${it.rec}`); if (it.audio) o.push(`audio ×${it.audio}`); if (it.light) o.push(`cahaya ×${it.light}`); if (it.edit) o.push(`mutu edit ×${it.edit}`);
  if (it.speed) o.push(`jam edit ×${it.speed}`); if (it.stream) o.push(`stream ×${it.stream}`); if (it.net) o.push(`internet tingkat ${it.net}`); if (it.stable) o.push(`stabil ${Math.round(it.stable * 1000) / 10}%`);
  if (it.reliability) o.push(`risiko file rusak ${Math.round((1 - it.reliability) * 1000) / 10}%`); if (it.pcLive) o.push('bisa live dari PC'); if (it.dataCost) o.push('live memakai kuota data');
  return o.join(' · ');
}
export function gear() {
  const c = C(), bal = E.S.player.balance;
  const html = `<div class="grid g-2">
    <section class="panel st-wide"><div class="panel-h"><h2>Peralatan</h2><span class="subtle s">Saldo ${rp(bal)}</span></div><div class="panel-b gear-grid">${Object.entries(EQUIPMENT).map(([k, cat]) => `<div class="gear-cat"><h3>${cat.name}</h3>${cat.items.map(it => { const own = c.owned.includes(it.id), on = c.gear[k] === it.id; return `<div class="gear-it ${on ? 'on' : ''}"><div class="grow"><b>${esc(it.name)}</b><div class="subtle s">${effects(it)}</div><div class="s">${it.cost ? rp(it.cost) : 'Gratis'}${it.monthly ? ` + ${rp(it.monthly)}/bulan` : ''}</div></div>${on ? '<span class="chip pos">Dipakai</span>' : own ? `<button class="btn sm" data-gear="${it.id}">Pakai</button>` : `<button class="btn sm primary" data-gear="${it.id}" data-cost="${it.cost}" ${bal < it.cost ? 'disabled' : ''}>Beli</button>`}</div>`; }).join('')}</div>`).join('')}</div></section>
    <section class="panel"><div class="panel-h"><h2>Skill kreator</h2></div><div class="panel-b stack" style="gap:12px">${Object.entries(CREATOR_SKILLS).map(([k, s]) => `<div><div class="row between"><b>${s.name}</b><span class="num">${fN(c.skills[k])}/100</span></div><div class="bar"><i style="width:${c.skills[k]}%"></i></div><div class="subtle s">${esc(s.desc)}</div><div class="row wrap" style="gap:6px;margin-top:4px"><button class="btn sm" data-train="${k}" ${c.trainedToday ? 'disabled' : ''}>Latihan mandiri (2 jam)</button><button class="btn sm" data-course="${k}" ${c.courseToday || bal < 300000 ? 'disabled' : ''}>Kelas Rp 300 rb</button></div></div>`).join('')}
      <p class="subtle s" style="margin:0">Skill juga naik pelan saat mengerjakan tahap produksi dan live. Latihan mandiri sekali per hari (butuh waktu luang & energi); kelas sekali per hari. Kenaikan makin kecil saat skill tinggi.</p></div></section>
    <div class="stack" style="gap:16px">
      <section class="panel"><div class="panel-h"><h2>Waktu kreator</h2></div><div class="panel-b stack" style="gap:8px">
        <label class="field"><span>Batas jam kreator per hari</span><select class="input" id="dh">${Array.from({ length: 20 }, (_, i) => (i + 1) / 2).map(h => `<option value="${h}" ${c.settings.dailyHours === h ? 'selected' : ''}>${String(h).replace('.', ',')} jam</option>`).join('')}</select></label>
        <p class="subtle s" style="margin:0">Lebih banyak jam = produksi lebih cepat, tetapi energi turun (mutu produksi turun bila energi rendah) dan waktu luang berkurang. Tidak ada kewajiban menjadi kreator.</p></div></section>
      ${tierCard()}
    </div>
  </div>`;
  return { html, mount: el => {
    el.addEventListener('change', e => { if (e.target.id === 'dh') res(CR.setDailyHours(+e.target.value)); });
    el.addEventListener('click', e => {
      const q = s => e.target.closest(s);
      if (q('[data-gear]')) { const b = q('[data-gear]'), cost = +b.dataset.cost || 0; if (cost && !confirm(`Beli peralatan ini seharga ${rp(cost)}?`)) return; return res(CR.buyGear(b.dataset.gear)); }
      if (q('[data-train]')) return res(CR.train(q('[data-train]').dataset.train, false));
      if (q('[data-course]')) { if (confirm('Ikuti kelas seharga Rp 300.000?')) res(CR.train(q('[data-course]').dataset.course, true)); }
    });
  } };
}
