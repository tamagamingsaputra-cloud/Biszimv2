// CONTENT CREATOR STUDIO — halaman utama (router hash + render). Bagian dari Career; navigasi global BizSim tidak berubah.
import { mountShell } from '../ui/shell.js';
import { icon, esc, toast } from '../ui/ui.js';
import { E, C, CR, PLATFORMS, ageNow } from './studio/common.js';
import * as V1 from './studio/overview.js';
import * as V2 from './studio/create.js';
import * as V3 from './studio/queue.js';
import * as V4 from './studio/live.js';
import * as V5 from './studio/money.js';
import * as V6 from './studio/analytics.js';
import { DISCLAIMER } from '../data/creator-platforms.js';

const page = await mountShell('studio', 'Content Creator Studio', { banner: false });
// Hook QA lokal saja (aktif hanya dengan parameter ?visitor= di localhost) untuk pengujian otomatis.
if (new URLSearchParams(location.search).has('visitor') && ['localhost', '127.0.0.1'].includes(location.hostname)) window.__bizsimQA = { E, CR };

const TABS = [
  ['overview', 'Overview', 'dashboard'], ['accounts', 'Channels & Accounts', 'users'], ['planner', 'Content Planner', 'calendar'], ['create', 'Create Content', 'edit'],
  ['queue', 'Production Queue', 'layers'], ['published', 'Published', 'video'], ['live', 'Live Studio', 'broadcast'], ['analytics', 'Audience & Analytics', 'chart'],
  ['monetization', 'Monetization', 'wallet'], ['sponsors', 'Sponsorship & Collab', 'handshake'], ['gear', 'Equipment & Skills', 'tool'],
];
const VIEWS = {
  overview: V1.overview, accounts: V1.accountsView, account: V1.accountDetail, planner: V1.planner,
  create: V2.create, queue: V3.queue, published: V3.published, content: V3.contentDetail,
  live: V4.live, monetization: V5.monetization, sponsors: V5.sponsors, analytics: V6.analytics, gear: V6.gear,
};
const PARENT = { account: 'accounts', content: 'published' };

page.innerHTML = `<div class="page-head studio-head"><div><div class="crumbs subtle"><a href="career.html">Career & Jobs</a> / Content Creator Studio</div>
  <p class="hide-m">Karier kreator opsional di samping sekolah dan pekerjaan. Setiap platform punya aturan sendiri; tayangan, follower, dan pendapatan dihitung bertahap oleh simulation engine dan bisa naik maupun turun.</p></div><span class="sim-badge hide-m">Simulated</span></div>
  <div id="st-banner"></div>
  <nav class="tabs edu-tabs st-tabs" role="tablist" id="st-tabs" aria-label="Bagian Creator Studio"></nav>
  <div id="st-live-bar"></div>
  <div id="view" class="st-view"></div>
  <p class="subtle st-disclaimer">${esc(DISCLAIMER)}</p>`;

let route = [], cur = null, lastRender = 0, pendingRender = null;
function parse() { const h = decodeURIComponent(location.hash.slice(1) || 'overview'); route = h.split('/'); if (!VIEWS[route[0]]) route = ['overview']; }

function tabs() {
  const c = C(), active = PARENT[route[0]] || route[0];
  const cnt = { queue: c.queue.length + c.contents.filter(k => k.status === 'ready').length, live: c.live ? 1 : 0, sponsors: c.offers.length, monetization: 0 };
  $('#st-tabs').innerHTML = TABS.map(([k, l, ic]) => `<a class="tab" role="tab" href="#${k}" aria-selected="${active === k}">${icon(ic)}<span>${l}</span>${cnt[k] ? `<span class="count">${cnt[k]}</span>` : ''}</a>`).join('');
  const sel = $('#st-tabs [aria-selected="true"]'); if (sel && sel.scrollIntoView && !tabs.done) { sel.scrollIntoView({ block: 'nearest', inline: 'center' }); tabs.done = true; }
}
function $(s) { return document.querySelector(s); }

function banners() {
  $('#st-banner').innerHTML = ''; // Tidak ada bypass usia; aturan usia selalu memakai umur simulasi karakter.
  const L = C().live;
  $('#st-live-bar').innerHTML = L && route[0] !== 'live' ? `<a class="live-strip" href="#live"><span class="live-dot"></span><b>LIVE</b> di ${esc(PLATFORMS[L.platform].name)} · ${L.minute} menit · ${Math.round(L.ccv)} menonton<span class="spacer"></span>Buka Live Studio ${icon('arrowR')}</a>` : '';
}

export function render(force = false) {
  if (!force && document.querySelector('dialog[open]')) { pendingRender = true; return; }
  parse(); tabs(); banners();
  const fn = VIEWS[route[0]];
  const ctx = { route, rerender: () => render(true) };
  const out = fn(ctx) || { html: '' };
  cur = { name: route[0], out };
  // Elemen view diganti baru setiap render agar listener dari view sebelumnya tidak menumpuk.
  const old = $('#view'), el = old.cloneNode(false); old.replaceWith(el); el.innerHTML = out.html; out.mount?.(el, ctx);
  lastRender = Date.now(); pendingRender = null;
}

// Re-render saat state berubah. Form yang sedang diisi (wizard, setup live) tidak dirender ulang penuh:
// view menyediakan update() parsial agar input tidak hilang.
function onState(kind) {
  if (!cur) return;
  if (document.querySelector('dialog[open]')) { pendingRender = true; return; }
  const out = cur.out, ae = document.activeElement;
  const typing = ae && ae.matches?.('input,select,textarea') && $('#view').contains(ae);
  if (out.update) { out.update(kind); banners(); tabs(); return; }
  if (typing || out.keep) return;
  if (kind === 'tick' && Date.now() - lastRender < 900) return;
  const y = window.scrollY; render(); window.scrollTo(0, y);
}
E.on('tick', () => onState('tick'));
E.on('change', () => onState('change'));
E.on('live', () => onState('live'));
document.addEventListener('close', e => { if (e.target.tagName === 'DIALOG' && pendingRender) setTimeout(() => render(), 0); }, true);
window.addEventListener('hashchange', () => { tabs.done = false; window.scrollTo(0, 0); render(true); });

// Notifikasi penting (hak cipta, pelanggaran, monetisasi, sponsor) & gift masuk.
const NOTE_KIND = { copyright: 'error', policy: 'error', strike: 'error', monetization: 'ok', sponsor: 'ok', live: 'ok' };
E.on('creator-note', n => { if (NOTE_KIND[n.kind]) toast(n.text, NOTE_KIND[n.kind]); });
let giftBuf = [], giftT = null;
E.on('creator-gift', g => {
  if (cur?.name === 'live') return; // di Live Studio gift tampil di feed
  giftBuf.push(g); clearTimeout(giftT);
  giftT = setTimeout(() => { const n = giftBuf.length, net = giftBuf.reduce((s, x) => s + x.net, 0); toast(n === 1 ? `Dukungan masuk: ${giftBuf[0].name} dari ${giftBuf[0].who}` : `${n} dukungan live masuk (bersih kreator ±Rp ${Math.round(net).toLocaleString('id-ID')})`); giftBuf = []; }, 1200);
});

window.addEventListener('beforeunload', () => { E.save(); });
render(true);
