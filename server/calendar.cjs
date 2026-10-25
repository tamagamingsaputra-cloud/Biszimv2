// Salinan aturan kalender game untuk server (sumber yang sama: public/assets/js/engine/calendar.js).
// Kesamaan nilai diperiksa oleh regression test tests/calendar.test.mjs.
const CALENDAR = Object.freeze({ id: 'BZC-1', monthsPerYear: 12, daysPerMonth: 30, daysPerWeek: 7, leapYears: false, hoursPerDay: 24, minutesPerHour: 60, secondsPerMinute: 60, tickMinutes: 30, firstWeekday: 1 });
const DAYS_PER_YEAR = 360, SEC_PER_TICK = 1800, TICKS_PER_DAY = 48, WARMUP_DAYS = 14;
const mod = (a, n) => ((a % n) + n) % n;
const WEEKDAYS = ['Minggu', 'Senin', 'Selasa', 'Rabu', 'Kamis', 'Jumat', 'Sabtu'];
function dateParts(d) { const y = Math.floor(d / DAYS_PER_YEAR), r = d - y * DAYS_PER_YEAR; return { day: d, year: y + 1, month: Math.floor(r / 30) + 1, date: (r % 30) + 1, weekday: mod(d + 1, 7) }; }
const pad = n => String(n).padStart(2, '0');
/** Validasi jam simulasi dari save game. Mengembalikan { abs, day, label } atau null jika tidak valid. */
function readClock(game) {
  const c = game && game.clock; if (!c) return null;
  const g = Number(c.g), sec = Number(c.sec ?? (Number(c.sub) || 0) * 60);
  if (!Number.isInteger(g) || g < 0 || !Number.isFinite(sec) || sec < 0 || sec >= SEC_PER_TICK) return null;
  const day = Math.floor(g / TICKS_PER_DAY) - WARMUP_DAYS, s = (g % TICKS_PER_DAY) * SEC_PER_TICK + Math.floor(sec), p = dateParts(day);
  return { abs: g * SEC_PER_TICK + sec, day, label: `Tahun ${p.year} · Bulan ${p.month} · Tanggal ${p.date} · ${pad(Math.floor(s / 3600))}:${pad(Math.floor(s / 60) % 60)}:${pad(s % 60)}` };
}
module.exports = { CALENDAR, DAYS_PER_YEAR, SEC_PER_TICK, TICKS_PER_DAY, WEEKDAYS, dateParts, readClock };
