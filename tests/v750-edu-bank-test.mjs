import { SETS, buildQuestions, isGen, topicNames, _gens } from '../netlify/functions/v750-edu-bank.mjs';
import { K12, PROGRAMS, MAJORS } from '../netlify/functions/v750-edu-data.mjs';
let bad = 0, total = 0;
const chk = (x, tag) => { total++; const u = new Set(x.o); if (u.size !== 4 || x.k < 0 || x.o.length !== 4 || /undefined|NaN|Infinity/.test(JSON.stringify(x))) { bad++; if (bad < 15) console.log('BAD', tag, JSON.stringify(x)); } };
for (const [id, S] of Object.entries(SETS)) {
  const T = S.topics.map((_, i) => i);
  if (isGen(id)) for (let d = 1; d <= 3; d++) for (let s = 0; s < 60; s++) buildQuestions({ set: id, topics: T, diff: d, n: 12, seed: 'x' + s }).forEach(q => chk(q, id + ':d' + d));
  else { const qs = buildQuestions({ set: id, topics: T, diff: 1, n: 99, seed: 's' }); if (qs.length !== 12) console.log('POOL', id, qs.length); qs.forEach(q => chk(q, id)); for (let t = 0; t < 4; t++) if (S.q.filter(x => x[0] === t).length !== 3) console.log('TOPIC COUNT', id, t); }
}
// semua set yang dipakai kurikulum ada
const used = new Set([...Object.values(K12).flat().map(s => s.set), ...Object.values(MAJORS).flatMap(m => [m.dasar, m.prak]), ...Object.values(PROGRAMS).flatMap(p => p.courses.flat().map(c => c.set))]);
for (const u of used) if (!SETS[u]) console.log('SET HILANG', u);
for (const p of Object.values(PROGRAMS)) { if (p.courses.length !== p.terms) console.log('TERM MISMATCH', p.n); }
// determinisme
const a = JSON.stringify(buildQuestions({ set: 'math_smp', topics: [0,1,2], diff: 2, n: 10, seed: 'abc' })), b = JSON.stringify(buildQuestions({ set: 'math_smp', topics: [0,1,2], diff: 2, n: 10, seed: 'abc' })); console.log('deterministik:', a === b);
console.log('diperiksa', total, 'soal, bermasalah', bad);
const q = buildQuestions({ set: 'math_smp', topics: [1], diff: 1, n: 3, seed: 'demo' }); console.log(q.map(x => x.q + ' => ' + x.o[x.k]).join('\n'));
