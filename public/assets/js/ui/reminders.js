// Pengingat tagihan & tenggat. Dijalankan di setiap halaman (lewat shell) saat hari game berganti.
// Sumber data: engine/agenda.js (event yang benar-benar akan diproses engine). Setiap pengingat dicatat sekali
// ke log aktivitas (tersimpan di save server) dan tidak diulang untuk event yang sama.
import * as E from '../engine/core.js';
import { eventsBetween, fmtEvTime } from '../engine/agenda.js';
import { fmtDay } from '../engine/calendar.js';
import { toast } from './ui.js';

const isReminder = ev => ev.certainty === 'tenggat' || ev.cat === 'tagihan';
let lastDay = null;

export function checkReminders({ silent = false } = {}) {
  const S = E.S; if (!S || S.settings.reminders === false) return [];
  const d = E.dayNow(); if (d === lastDay) return []; lastDay = d;
  S.reminded ||= [];
  const fresh = [];
  for (const ev of eventsBetween(d, d + 1)) {
    if (!isReminder(ev)) continue;
    const key = `${ev.day}|${ev.cat}|${ev.title}`;
    if (S.reminded.includes(key)) continue;
    S.reminded.push(key); fresh.push(ev);
    const when = ev.day === d ? 'Hari ini' : 'Besok';
    E.log('pengingat', `Pengingat: ${ev.title} — ${when} (${fmtDay(ev.day)}), ${fmtEvTime(ev.sec).toLowerCase()}.`);
  }
  if (S.reminded.length > 300) S.reminded = S.reminded.slice(-300);
  if (fresh.length) { E.save(); if (!silent) toast(fresh.length === 1 ? `Pengingat: ${fresh[0].title} (${fresh[0].day === d ? 'hari ini' : 'besok'}).` : `${fresh.length} pengingat tagihan/tenggat untuk hari ini dan besok. Lihat Kalender.`, 'info'); }
  return fresh;
}
