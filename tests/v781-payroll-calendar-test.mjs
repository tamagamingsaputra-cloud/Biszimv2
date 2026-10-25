import assert from 'node:assert/strict';
import fs from 'node:fs';

const api = fs.readFileSync(new URL('../netlify/functions/api.mjs', import.meta.url), 'utf8');
const calendar = fs.readFileSync(new URL('../web/v740-clock.js', import.meta.url), 'utf8');

// Regression guards for the shared payroll rule used by simulation and calendar UI.
assert.match(api, /activeEmployment=s\.career\?\.status==='employed'&&Number\(s\.career\?\.salary\)>0/);
assert.match(api, /cashDelta=activeEmployment\?Math\.round\(Number\(s\.career\.salary\)\/30\):0/);
assert.match(calendar, /const employed = \(\) => \{ const c = S\(\)\.career \|\| \{\}; return c\.status === 'employed' && Number\(c\.salary\) > 0; \}/);
assert.match(calendar, /Gaji harian masuk/);
assert.doesNotMatch(calendar, /Akhir bulan: gaji bulanan lengkap/);
assert.match(api, /if\(cashDelta\)addNotice\(s,'Gaji diterima'/);
console.log('PASS payroll/calendar regression guards (baseline v7.8.1)');
