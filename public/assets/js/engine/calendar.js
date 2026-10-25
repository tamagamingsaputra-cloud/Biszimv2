// KALENDER & JAM SIMULASI BIZSIM — satu-satunya sumber aturan tanggal dan waktu game.
// Kalender ini fiktif dan berdiri sendiri: tidak membaca tanggal perangkat atau kalender dunia nyata,
// dan tidak pernah "dikoreksi" oleh tanggal nyata. Server memakai salinan aturan yang sama (server/calendar.cjs);
// kesamaan keduanya diperiksa oleh regression test.

export const CALENDAR = Object.freeze({
  id: 'BZC-1',
  monthsPerYear: 12,
  daysPerMonth: 30,       // semua bulan sama panjang
  daysPerWeek: 7,
  leapYears: false,       // tidak ada tahun kabisat, tidak ada hari sisipan
  hoursPerDay: 24,
  minutesPerHour: 60,
  secondsPerMinute: 60,
  tickMinutes: 30,        // engine ekonomi memproses dunia setiap 30 menit game
  firstWeekday: 1,        // hari ke-1 (Tahun 1 · Bulan 1 · Tanggal 1) adalah Senin
});
export const DAYS_PER_YEAR = CALENDAR.monthsPerYear * CALENDAR.daysPerMonth; // 360
export const SEC_PER_MIN = 60;
export const SEC_PER_HOUR = 3600;
export const SEC_PER_DAY = 86_400;
export const SEC_PER_TICK = CALENDAR.tickMinutes * 60; // 1.800
export const TICKS_PER_DAY = SEC_PER_DAY / SEC_PER_TICK; // 48

export const WEEKDAYS = ['Minggu', 'Senin', 'Selasa', 'Rabu', 'Kamis', 'Jumat', 'Sabtu'];
export const WD_SHORT = ['Min', 'Sen', 'Sel', 'Rab', 'Kam', 'Jum', 'Sab'];

/**
 * Kecepatan waktu. rate = detik game per 1 detik nyata. Normal sama dengan tempo lama BizSim
 * (1 tick 30 menit tiap 2,5 detik nyata = 12 menit game per detik).
 */
export const SPEEDS = Object.freeze([
  { id: 'lambat', rate: 60, label: '1m', name: 'Lambat', desc: '1 detik nyata = 1 menit game · 1 hari game ≈ 24 menit nyata' },
  { id: 'normal', rate: 720, label: '1×', name: 'Normal', desc: '1 detik nyata = 12 menit game · 1 hari game = 2 menit nyata' },
  { id: 'cepat', rate: 2_880, label: '4×', name: 'Cepat', desc: '1 detik nyata = 48 menit game · 1 hari game = 30 detik nyata' },
  { id: 'kilat', rate: 11_520, label: '16×', name: 'Kilat', desc: '1 detik nyata = 3 jam 12 menit game · 1 hari game = 7,5 detik nyata' },
]);
export const DEFAULT_RATE = 720;
/** Saat live streaming berjalan, waktu diperlambat agar setiap menit siaran bisa diikuti (sama dengan aturan lama). */
export const liveRate = rate => Math.max(60, rate / 12);
/** Batas langkah per frame. Jika tab tidak aktif / perangkat tidur, waktu game tidak "mengejar" waktu nyata. */
export const MAX_REAL_STEP_MS = 1000;

const mod = (a, n) => ((a % n) + n) % n;

/** Hari ke-d (0 = Tahun 1 · Bulan 1 · Tanggal 1). Hari negatif = periode pra-simulasi (riwayat pasar warm-up). */
export function dateParts(d) {
  const y = Math.floor(d / DAYS_PER_YEAR), r = d - y * DAYS_PER_YEAR;
  return { day: d, year: y + 1, month: Math.floor(r / CALENDAR.daysPerMonth) + 1, date: (r % CALENDAR.daysPerMonth) + 1, dayOfYear: r + 1, weekday: weekdayOf(d) };
}
/** 0 = Minggu … 6 = Sabtu (konvensi yang sama dengan seluruh engine). */
export const weekdayOf = d => mod(d + CALENDAR.firstWeekday, 7);
export const dateOfMonth = d => mod(d, CALENDAR.daysPerMonth) + 1;
export const monthOf = d => Math.floor(mod(d, DAYS_PER_YEAR) / CALENDAR.daysPerMonth) + 1;
export const yearOf = d => Math.floor(d / DAYS_PER_YEAR) + 1;
export const isMonthEnd = d => dateOfMonth(d) === CALENDAR.daysPerMonth;
export const isYearEnd = d => mod(d, DAYS_PER_YEAR) === DAYS_PER_YEAR - 1;
export const isWeekday = d => { const w = weekdayOf(d); return w >= 1 && w <= 5; };
/** Kebalikan dateParts. Tanggal di luar rentang ditolak (tidak dibulatkan diam-diam). */
export function dayFrom(year, month, date) {
  if (!Number.isInteger(year) || !Number.isInteger(month) || !Number.isInteger(date)) return null;
  if (month < 1 || month > CALENDAR.monthsPerYear || date < 1 || date > CALENDAR.daysPerMonth) return null;
  return (year - 1) * DAYS_PER_YEAR + (month - 1) * CALENDAR.daysPerMonth + (date - 1);
}
export const monthStartDay = (year, month) => dayFrom(year, month, 1);
/** Hari pertama berikutnya (≥ from) yang tanggalnya = date. */
export function nextDateOfMonth(from, date) { const dd = mod(date - dateOfMonth(from), CALENDAR.daysPerMonth); return from + dd; }
export function nextWeekday(from, wd) { return from + mod(wd - weekdayOf(from), 7); }

export const pad2 = n => String(n).padStart(2, '0');
/** Detik dalam hari → { h, m, s }. */
export function timeParts(secOfDay) {
  const t = Math.floor(mod(secOfDay, SEC_PER_DAY));
  return { h: Math.floor(t / 3600), m: Math.floor((t % 3600) / 60), s: t % 60 };
}
export const fmtHM = sec => { const t = timeParts(sec); return `${pad2(t.h)}:${pad2(t.m)}`; };
export const fmtHMS = sec => { const t = timeParts(sec); return `${pad2(t.h)}:${pad2(t.m)}:${pad2(t.s)}`; };

/** Format tanggal. 'full' untuk halaman Calendar, 'compact' untuk header/dashboard, 'short' untuk label grafik. */
export function fmtDay(d, style = 'compact') {
  const p = dateParts(d);
  if (style === 'full') return `${WEEKDAYS[p.weekday]} · Tahun ${p.year} · Bulan ${p.month} · Tanggal ${p.date}`;
  if (style === 'long') return `Tahun ${p.year} · Bulan ${p.month} · Tanggal ${p.date}`;
  if (style === 'short') return `${p.date}/${p.month}`;
  if (style === 'wd') return `${WD_SHORT[p.weekday]}, ${p.date}/${p.month}/Th ${p.year}`;
  return `Th ${p.year} · Bln ${p.month} · Tgl ${p.date}`;
}
export const fmtMonth = (year, month) => `Bulan ${month} · Tahun ${year}`;
/** Contoh: "Tahun 1 · Bulan 2 · Tanggal 12 · 12:13:01". */
export const fmtStamp = (d, secOfDay, style = 'long') => `${fmtDay(d, style)} · ${fmtHMS(secOfDay)}`;
