// Bar kebutuhan karakter (dipakai Dashboard & Kehidupan). Nilai & laju berasal dari engine/needs.js.
import * as E from '../engine/core.js';
import { NE } from '../engine/core.js';
import { icon, esc } from './ui.js';
export const NEED_ICON = { hunger: 'food', thirst: 'drop', energy: 'bolt', hygiene: 'shower', health: 'heart', mood: 'smile', stress: 'info', bladder: 'toilet' };
const SHORT = { hunger: 'Lapar', thirst: 'Haus', energy: 'Energi', hygiene: 'Bersih', health: 'Sehat', mood: 'Mood', stress: 'Stres', bladder: 'Toilet' };
export function needTiles(cls = '') {
  const st = NE.stateAt(E.S.clock.g), r = NE.rates(st);
  return NE.NEEDS.map(n => { const v = NE.value(n.key), lv = NE.level(n.key), w = n.invert ? v : v; const rate = r[n.key];
    return `<div class="need ${lv} ${cls}" title="${esc(n.effect)}"><div class="top">${icon(NEED_ICON[n.key])}<span title="${n.label}">${cls.includes('full') ? n.label : SHORT[n.key] || n.label}</span><span class="v">${Math.round(v)}</span></div><div class="track" role="progressbar" aria-label="${n.label}" aria-valuemin="0" aria-valuemax="100" aria-valuenow="${Math.round(v)}"><i style="width:${w}%"></i></div><div class="rate">${(n.invert ? NE.LEVEL_LABEL_STRESS : NE.LEVEL_LABEL)[lv]} · ${rate >= 0 ? '+' : ''}${rate.toFixed(1)}/jam</div></div>`; }).join('');
}
