// Pasar lowongan deterministik: perubahan mengikuti minggu simulasi dan seed karakter,
// bukan jam perangkat. Lowongan aktif/lamaran berjalan tidak hilang saat rotasi.
import { JOB_CATALOG } from '../data/job-catalog.js';

function hash32(value) {
  let h = 2166136261;
  for (let i = 0; i < value.length; i++) h = Math.imul(h ^ value.charCodeAt(i), 16777619);
  return h >>> 0;
}

export function availableJobs({ day = 0, seed = 'bizsim', activeJobId = null, activeApplicationIds = [] } = {}) {
  const week = Math.max(0, Math.floor(Number(day || 0) / 7));
  const pinned = new Set([activeJobId, ...activeApplicationIds].filter(Boolean));
  return JOB_CATALOG.filter((job, index) => {
    if (job.type === 'gig' || job.internship || pinned.has(job.id)) return true;
    // 20% lowongan katalog berotasi keluar setiap minggu; hasil stabil untuk seed/minggu yang sama.
    return hash32(`${String(seed)}:${week}:${job.id}:${index}`) % 5 !== 0;
  });
}
