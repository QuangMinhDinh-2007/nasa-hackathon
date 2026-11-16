// Health v2 tests for all three engines (run: node tools/health_tests.js)
// Rules: −20 per unpowered hour (unchanged), −5 per powered hour that dips below 25% battery (new), safe mode costs no
// health (Wildfire used to charge −10), Reliability = 10 × (½ uptime + ½ health/100), 0 after a critical failure.
const assert = require('assert');
const SW = require('../game/engine.js'), WF = require('../game/wildfire-engine.js'), FL = require('../game/flood-engine.js');
let passed = 0; const t = (name, fn) => { fn(); passed++; console.log('  ✓ ' + name); };
const KEYS = ['instrument', 'observation', 'power', 'comms', 'storage'];
const designOf = hw => { const d = {}; KEYS.forEach((k, i) => d[k] = (hw >> i) & 1 ? 'adv' : 'std'); return d; };
const decOf = (CH, dec) => CH.map((ch, ci) => { const b = (dec >> (ci * 2)) & 3; return ch.controls.map((o, gi) => o[(b >> gi) & 1]); });
const near = (a, b) => Math.abs(a - b) < 1e-9;

// Every valid design × every two-option decision set, run under the old and the new rules side by side.
function pairs(m) {
  const out = [];
  if (m === 'storm') { const C = SW.makeConfig('v35');
    for (let hw = 0; hw < 32; hw++) { const d = designOf(hw); if (!SW.designTotals(d, C).valid) continue;
      for (let dec = 0; dec < 256; dec++) { const dd = decOf(SW.CHALLENGES, dec); out.push({ d, dd, old: SW.runFull(d, dd, 'v34'), now: SW.runFull(d, dd, 'v35') }); } } }
  if (m === 'fire') for (const arch of ['pm-sso', 'dawn-dusk-sso'])
    for (let hw = 0; hw < 32; hw++) { const d = designOf(hw); if (!WF.totals(d).valid) continue;
      for (let dec = 0; dec < 256; dec++) { const dd = decOf(WF.CHALLENGES, dec); out.push({ d, dd, arch, old: WF.runFull(d, dd, null, null, arch, 'health-v1'), now: WF.runFull(d, dd, null, null, arch) }); } }
  if (m === 'flood') { const C = FL.makeConfig('v42'), CH = FL.challengesFor(C);
    for (let hw = 0; hw < 32; hw++) { const d = designOf(hw); if (!FL.totals(d, C).valid) continue;
      for (let dec = 0; dec < 256; dec++) { const dd = decOf(CH, dec); out.push({ d, dd, old: FL.runFull(d, dd, 'v41'), now: FL.runFull(d, dd, 'v42') }); } } }
  return out;
}
const RUNS = { storm: pairs('storm'), fire: pairs('fire'), flood: pairs('flood') };
const uptime = { storm: M => M.essentialHours / 24, fire: M => M.opHours / 24, flood: M => (M.essentialSteps * 5 / 60 - 0.5 * M.safeSteps * 5 / 60) / 24 };
const clamp01 = x => Math.max(0, Math.min(1, x));

console.log('Health is bookkeeping only');
for (const m of ['storm', 'fire', 'flood']) t(`${m}: science, delivery, efficiency, battery and the event timeline are identical under old and new rules`, () => {
  for (const { old, now } of RUNS[m]) {
    assert.ok(near(old.s.sci, now.s.sci) && near(old.s.del, now.s.del) && near(old.s.eff, now.s.eff));
    assert.ok(near(old.M.battery, now.M.battery)); assert.strictEqual(old.M.failed, now.M.failed);
    assert.deepStrictEqual(old.s.gates, now.s.gates); // G4 is still "no critical failure"
  } });

console.log('New health rules');
t('storm: final health = 100 − 20 × unpowered hours − 5 × deep-discharge hours (0 after failure)', () => {
  for (const { now: { M } } of RUNS.storm) assert.strictEqual(M.health, M.failed ? 0 : Math.max(0, 100 - 20 * M.incidents - 5 * M.deepHours)); });
t('flood: final health = 100 − 20 × unpowered hours − 5 × deep-discharge hours; safe mode costs nothing', () => {
  for (const { now: { M } } of RUNS.flood) assert.strictEqual(M.health, M.failed ? 0 : Math.max(0, 100 - 20 * M.unpoweredHours.size - 5 * M.deepHours.size)); });
t('fire: safe mode no longer costs health; deep discharge costs 5 per hour', () => {
  let safeRuns = 0;
  for (const { now: { M } } of RUNS.fire) { const unpow = M.unpoweredHrs.size; if (M.events.some(e => e.msg === 'Safe mode entered')) safeRuns++;
    if (!M.failed && unpow === 0) assert.strictEqual(M.health, 100 - 5 * M.deepHours.size); }
  assert.ok(safeRuns > 0, 'some runs enter safe mode'); });
t('a deep-discharge hour is only charged when the battery really went below 25% in that hour', () => {
  const { M } = SW.runFull(designOf(1), decOf(SW.CHALLENGES, 0), 'v35'); M.traceOn = true;
  for (const e of M.events.filter(e => e.type === 'deep')) assert.ok(/below 25%/.test(e.msg));
  for (const { now: { M } } of RUNS.flood) for (const h of M.deepHours) assert.ok(!M.unpoweredHours.has(h), 'unpowered and deep are not double-charged'); });
t('old rules are untouched: no deep-discharge loss in storm v34 / flood v41 / fire health-v1', () => {
  for (const { old: { M } } of RUNS.storm) assert.strictEqual(M.deepHours, 0);
  for (const { old: { M } } of RUNS.flood) assert.strictEqual(M.deepHours.size, 0);
  for (const { old: { M } } of RUNS.fire) assert.strictEqual(M.deepHours.size, 0); });

console.log('Reliability uses health');
for (const m of ['storm', 'fire', 'flood']) t(`${m}: Reliability = 10 × (½ uptime + ½ health), 0 after failure; old rules = 10 × uptime`, () => {
  for (const { old, now } of RUNS[m]) {
    assert.ok(near(now.s.rel, now.M.failed ? 0 : 10 * (0.5 * clamp01(uptime[m](now.M)) + 0.5 * now.M.health / 100)));
    assert.ok(near(old.s.rel, old.M.failed ? 0 : 10 * clamp01(uptime[m](old.M))));
  } });

console.log('Health now varies and changes results');
for (const m of ['storm', 'fire', 'flood']) t(`${m}: final health takes several values and lowers the total in some runs`, () => {
  const values = new Set(RUNS[m].map(r => r.now.M.health)), lower = RUNS[m].filter(r => r.now.s.total < r.old.s.total).length;
  assert.ok(values.size >= 4, `${m}: ${[...values]}`); assert.ok(lower > 0);
  const pct = x => (100 * x / RUNS[m].length).toFixed(1) + '%';
  console.log(`      ${RUNS[m].length} runs · health values ${[...values].sort((a, b) => b - a).join('/')} · below 100%: ${pct(RUNS[m].filter(r => r.now.M.health < 100).length)} · total lower: ${pct(lower)}`); });

console.log(`\n${passed} health tests passed`);
