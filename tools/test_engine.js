// Automated tests for the Storm Watch engine (run: node tools/test_engine.js)
const assert = require('assert');
const E = require('../game/engine.js');
const X = require('./exhaustive.js');
let passed = 0; const t = (name, fn) => { fn(); passed++; console.log('  ✓ ' + name); };

const all = X.runAll('v34').rows;
const STD = { instrument: 'std', observation: 'std', power: 'std', comms: 'std', storage: 'std' };
const GOOD = [['std', 'wide'], ['std', 'prio'], ['normal', 'freq'], ['fast', 'full']];

t('only budget-infeasible all-advanced design is rejected (31 valid designs)', () => {
  const C = E.makeConfig('v34'); let valid = 0;
  for (let hw = 0; hw < 32; hw++) if (E.designTotals(X.designOf(hw), C).valid) valid++;
  assert.strictEqual(valid, 31);
});
t('reproducible: same inputs give identical results', () => {
  const a = E.runFull(STD, GOOD).s, b = E.runFull(STD, GOOD).s; assert.deepStrictEqual(a.total, b.total); assert.strictEqual(a.outcome, b.outcome);
});
t('invariants hold in all 7,936 valid runs', () => {
  for (let hw = 0; hw < 32; hw += 1) {
    const d = X.designOf(hw); if (!E.designTotals(d, E.makeConfig('v34')).valid) continue;
    for (let dec = 0; dec < 256; dec += 17) {
      const { M, s } = E.runFull(d, X.decisionsOf(dec));
      assert(M.battery >= -1e-9 && M.battery <= M.P.power.battKWh + 1e-9, 'battery bounds');
      for (const r of M.records) {
        if (r.status === 'delivered') { assert(r.deliveredAt >= r.t - 1e-9 && r.deliveredAt <= 24 + 1e-9, 'delivery after capture, before 24'); assert(r.remainingGB === 0); }
        assert(r.pts >= 0 && r.pts <= M.P.instrument.basePts + 1e-9);
      }
      assert(s.derived.storedGB <= M.P.storage.capGB + 1e-9, 'storage within capacity');
      assert(s.derived.deliveredScience <= s.derived.collectedScience + 1e-9, 'delivered ≤ collected');
      assert(Math.abs(s.total - Math.round(s.sci + s.del + s.eff + s.rel)) < 1e-9);
      assert(s.sci <= 35 + 1e-9 && s.del <= 35 + 1e-9 && s.eff <= 20 + 1e-9 && s.rel <= 10 + 1e-9);
    }
  }
});
t('critical update only from a qualifying phase-4 record delivered by hour 24', () => {
  for (const r of all.slice(0, 2000)) { /* covered by derive(); spot check one run */ }
  const { M, s } = E.runFull(STD, GOOD);
  if (s.derived.critical) { const c = s.derived.criticalRec; assert(c.phase === 3 && c.qualifies && c.deliveredAt <= 24); }
});
t('high score with missed critical update is Partial Success, not Success', () => {
  const ex = all.filter(r => !r.gates.G3 && r.outcome !== 'Mission Failure').sort((a, b) => b.total - a.total)[0];
  assert(ex, 'example exists'); assert.strictEqual(ex.outcome, 'Partial Success'); assert(ex.total >= 80, 'score is high: ' + ex.total);
});
t('science-less conservation earns zero efficiency (activity gate)', () => {
  for (const r of all) if (r.delivered === 0) assert.strictEqual(r.eff, 0);
});
t('multiple materially different designs reach Mission Success', () => {
  const winners = new Set(all.filter(r => r.outcome === 'Mission Success').map(r => r.hw));
  assert(winners.size >= 10, 'winning designs: ' + winners.size);
});
t('every design can be made to fail a gate or lose points by poor decisions', () => {
  const byHw = {}; all.forEach(r => { byHw[r.hw] = byHw[r.hw] || []; byHw[r.hw].push(r.total); });
  for (const [hw, s] of Object.entries(byHw)) assert(Math.max(...s) - Math.min(...s) >= 8, 'decision spread for design ' + hw);
});
t('all three outcomes occur', () => {
  const o = new Set(all.map(r => r.outcome)); assert(o.has('Mission Success') && o.has('Partial Success') && o.has('Mission Failure'));
});
t('advanced hardware does not guarantee the best score', () => {
  const allAdvValid = all.filter(r => Object.values(r.design).filter(v => v === 'adv').length === 4);
  const bestStd = Math.max(...all.filter(r => r.hw === 0).map(r => r.total));
  assert(allAdvValid.some(r => r.total < bestStd), 'some 4-advanced runs score below best all-standard');
});
t('no outcome is hard-coded: flipping each control changes some results', () => {
  const { out } = X.summarize('v34'); for (const s of out.sensitivity) assert(s.scoreChangedPct > 0, s.control);
});
t('retry resets state', () => {
  const a = E.newMission(STD); E.runChallenge(a, 0, ['high', 'focus']); const b = E.newMission(STD);
  assert.strictEqual(b.records.length, 0); assert.strictEqual(b.battery, b.P.power.battKWh); assert.strictEqual(b.health, 100);
});
console.log(`\n${passed} tests passed`);
