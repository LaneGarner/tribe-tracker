// Synthetic CPU benchmark, independent of network and device frame rate.
const fs = require('node:fs');
const path = require('node:path');
const assert = require('node:assert/strict');
const { performance } = require('node:perf_hooks');
const ts = require('typescript');
const helper = {};
const code = ts.transpileModule(fs.readFileSync(path.join(__dirname, '../utils/checkinIndex.ts'), 'utf8'), {
  compilerOptions: { module: ts.ModuleKind.CommonJS },
}).outputText;
new Function('exports', code)(helper);
const users = Array.from({ length: 200 }, (_, i) => `user-${i}`);
const checkins = Array.from({ length: 73000 }, (_, i) => ({ userId: users[i % users.length], checkinDate: String(i) }));
const baseline = () => new Map(users.map(id => [id, checkins.filter(c => c.userId === id).map(c => c.checkinDate)]));
const indexed = () => helper.indexCheckinsByUser(checkins);
assert.deepEqual(indexed(), baseline());
const measure = run => {
  run();
  const start = performance.now();
  for (let i = 0; i < 5; i++) run();
  return Number(((performance.now() - start) / 5).toFixed(2));
};
console.log(JSON.stringify({ users: users.length, checkins: checkins.length,
  baselineMeanMs: measure(baseline), indexedMeanMs: measure(indexed),
  checkinVisitsBefore: users.length * checkins.length, checkinVisitsAfter: checkins.length,
}, null, 2));
