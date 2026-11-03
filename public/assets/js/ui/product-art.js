// Gambar produk marketplace: piktogram garis per subkategori (relevan dengan barangnya) di atas latar warna kategori.
// Tidak memakai foto acak/placeholder; setiap subkategori punya gambar sendiri dan gaya yang sama dengan ikon BizSim lainnya.
import { icon } from './ui.js';

const G = {
  ponsel: '<rect x="7" y="2.5" width="10" height="19" rx="2"/><path d="M11 18.5h2"/>',
  komputer: '<rect x="4" y="5" width="16" height="11" rx="1.5"/><path d="M2 19h20"/>',
  audio: '<path d="M4 15v-3a8 8 0 0 1 16 0v3"/><rect x="3" y="14" width="4" height="6" rx="1.5"/><rect x="17" y="14" width="4" height="6" rx="1.5"/>',
  pria: '<path d="M8 3L3 6l2 4 3-1v12h8V9l3 1 2-4-5-3a4 4 0 0 1-8 0z"/>',
  wanita: '<path d="M9 3l1 5-4 13h12L14 8l1-5"/><path d="M9 3h6"/>',
  sepatu: '<path d="M3 16v-5l5-1 3 2h4c3 0 6 1 6 4v1H3z"/><path d="M3 19h18"/>',
  instan: '<path d="M4 11h16a8 8 0 0 1-16 0z"/><path d="M8 11V6M12 11V4M16 11V6"/><path d="M8 21h8"/>',
  minuman: '<path d="M6 7h12l-1.5 14h-9z"/><path d="M5 7h14M14 7l2-4"/>',
  camilan: '<path d="M5 4h14v16H5z"/><path d="M5 8h14M5 16h14"/><circle cx="12" cy="12" r="2"/>',
  tidur: '<path d="M3 18V7M21 18v-5a3 3 0 0 0-3-3h-8v6"/><path d="M3 15h18"/><circle cx="6.5" cy="11.5" r="1.8"/>',
  dapur: '<path d="M5 10h14v8a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2z"/><path d="M3 10h2M19 10h2M9 6c0-2 2-2 2-4M14 6c0-2 2-2 2-4"/>',
  listrik: '<path d="M9 18h6M10 21h4"/><path d="M12 3a6 6 0 0 0-4 10.5c.7.7 1 1.5 1 2.5h6c0-1 .3-1.8 1-2.5A6 6 0 0 0 12 3z"/>',
  sepeda: '<circle cx="6" cy="16" r="3.5"/><circle cx="18" cy="16" r="3.5"/><path d="M6 16l3-7h6l3 7M9 9l4 7M8 6h3"/>',
  motor: '<circle cx="5.5" cy="16" r="3"/><circle cx="18.5" cy="16" r="3"/><path d="M5.5 16h5l3-6h3l2 6M12 10H9"/>',
  rawat: '<circle cx="12" cy="12" r="3"/><path d="M12 3v3M12 18v3M3 12h3M18 12h3M5.6 5.6l2.1 2.1M16.3 16.3l2.1 2.1M18.4 5.6l-2.1 2.1M7.7 16.3l-2.1 2.1"/>',
  vitamin: '<rect x="2.5" y="8.5" width="19" height="7" rx="3.5" transform="rotate(-45 12 12)"/><path d="M8.5 8.5l7 7"/>',
  obat: '<rect x="4" y="4" width="16" height="16" rx="3"/><path d="M12 8v8M8 12h8"/>',
  alkes: '<path d="M6 3v6a4 4 0 0 0 8 0V3"/><path d="M10 13v3a4 4 0 0 0 8 0v-2"/><circle cx="18" cy="12" r="2"/>',
  wajah: '<circle cx="12" cy="12" r="10"/><path d="M8 14s1.5 2 4 2 4-2 4-2M9 9h.01M15 9h.01"/>',
  tubuh: '<path d="M10 3h4v3h-4zM8 6h8v15H8z"/><path d="M8 11h8"/>',
  rambut: '<path d="M3 8h18v4H3z"/><path d="M5 12v5M8 12v5M11 12v5M14 12v5M17 12v5M20 12v5"/>',
  buku: '<path d="M4 4h6a3 3 0 0 1 3 3v13a2 2 0 0 0-2-2H4z"/><path d="M20 4h-6a3 3 0 0 0-3 3v13a2 2 0 0 1 2-2h7z"/>',
  atk: '<path d="M4 20l1-4L16 5a2.1 2.1 0 0 1 3 3L8 19z"/><path d="M14 7l3 3"/>',
  sekolah: '<path d="M7 8a5 5 0 0 1 10 0v12a1 1 0 0 1-1 1H8a1 1 0 0 1-1-1z"/><path d="M9 3h6M9 14h6v4H9z"/>',
  pakaian: '<path d="M5 5h14l1 14h-6l-2-7-2 7H4z"/>',
  fitness: '<path d="M2 10v4M5 8v8M19 8v8M22 10v4M5 12h14"/>',
  outdoor: '<path d="M3 20L12 4l9 16z"/><path d="M12 4v16M8 20l4-7 4 7"/>',
  bibit: '<path d="M12 21V11"/><path d="M12 11C12 7 9 5 5 5c0 4 2 6 7 6z"/><path d="M12 14c0-3 2-5 6-5 0 3-2 5-6 5z"/>',
  pupuk: '<path d="M7 7l1-4h8l1 4"/><path d="M6 7h12l1 14H5z"/><path d="M9 13h6"/>',
  alattani: '<path d="M12 3v11"/><path d="M8 14h8l-1 6h-6z"/><path d="M10 3h4"/>',
  tangan: '<path d="M14.7 6.3a4 4 0 0 0-5.4 5.4L3 18l3 3 6.3-6.3a4 4 0 0 0 5.4-5.4l-2.6 2.6-2.4-.6-.6-2.4z"/>',
  kantor: '<rect x="6" y="4" width="12" height="17" rx="2"/><path d="M9 4h6v3H9zM9 12h6M9 16h4"/>',
  k3: '<path d="M4 16a8 8 0 0 1 16 0z"/><path d="M3 16h18v3H3z"/><path d="M12 8v4"/>',
  pakanhewan: '<path d="M4 12h16a8 8 0 0 1-16 0z"/><path d="M8 8l1-2h6l1 2"/>',
  aksesorihewan: '<circle cx="7" cy="9" r="1.8"/><circle cx="12" cy="6" r="1.8"/><circle cx="17" cy="9" r="1.8"/><path d="M12 12c-3 0-5 3-5 5 0 2 2 2 5 1 3 1 5 1 5-1 0-2-2-5-5-5z"/>',
  rawathewan: '<path d="M20.8 5.6a5 5 0 0 0-7.1 0L12 7.3l-1.7-1.7a5 5 0 0 0-7.1 7.1L12 21.5l8.8-8.8a5 5 0 0 0 0-7.1z"/><path d="M12 10v5M9.5 12.5h5"/>',
};
// Warna latar per kategori (matahari terang, kontras ikon ≥ 4.5:1 terhadap latar).
const TINT = { elektronik: ['#E6F0FB', '#1F4E8C'], fashion: ['#FCE7F3', '#9D174D'], makanan: ['#FFF1DB', '#9A5B00'], rumah: ['#E7F3E4', '#2F6B2A'], kendaraan: ['#E9EDF2', '#34465A'], kesehatan: ['#FDE8E8', '#B42318'], kecantikan: ['#F3E8FF', '#6B21A8'], pendidikan: ['#E4EDF7', '#183D61'], olahraga: ['#E0F5EE', '#0F766E'], pertanian: ['#EDF5D6', '#4D6B0E'], kerja: ['#FDEBDD', '#9C4A1A'], hewan: ['#FFF6D1', '#7A5B00'] };
const FIRST = { elektronik: 'ponsel', fashion: 'pria', makanan: 'instan', rumah: 'tidur', kendaraan: 'sepeda', kesehatan: 'vitamin', kecantikan: 'wajah', pendidikan: 'buku', olahraga: 'fitness', pertanian: 'bibit', kerja: 'tangan', hewan: 'aksesorihewan' };

/** Gambar produk: <div class="pimg"> dengan piktogram subkategori. */
export function productArt(sub, cat, { label = '' } = {}) {
  const [bg, fg] = TINT[cat] || ['#EEF2F6', '#34465A'];
  return `<div class="pimg" style="background:${bg};color:${fg}" role="img" aria-label="${label.replace(/"/g, '')}"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.4" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">${G[sub] || G[FIRST[cat]] || ''}</svg></div>`;
}
/** Ikon kategori untuk chip/kisi kategori. */
export function catArt(cat) { const [bg, fg] = TINT[cat] || ['#EEF2F6', '#34465A']; return `<span class="cat-ico" style="background:${bg};color:${fg}"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.7" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">${G[FIRST[cat]] || ''}</svg></span>`; }

const LOGO = {
  bag: '<path d="M6 8h12l1 12H5z"/><path d="M9 8a3 3 0 0 1 6 0"/>',
  gem: '<path d="M6 4h12l4 6-10 11L2 10z"/><path d="M2 10h20M9 4l-2 6 5 11 5-11-2-6"/>',
  store: '<path d="M3 9l1.5-5h15L21 9"/><path d="M4 9v11h16V9"/><path d="M3 9a3 3 0 0 0 6 0 3 3 0 0 0 6 0 3 3 0 0 0 6 0"/><path d="M10 20v-5h4v5"/>',
  plus: '<circle cx="12" cy="12" r="9"/><path d="M12 7.5v9M7.5 12h9"/>',
};
/** Logo marketplace fiktif: kotak warna merek + glif putih. */
export function mpLogo(m, size = 44) {
  return `<span class="mp-logo" style="--s:${size}px;background:${m.color}" role="img" aria-label="Logo ${m.name}"><svg viewBox="0 0 24 24" fill="none" stroke="#fff" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">${LOGO[m.logo] || LOGO.bag}</svg></span>`;
}
export { icon };
