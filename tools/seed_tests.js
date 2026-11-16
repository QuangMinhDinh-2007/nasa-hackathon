// Mission Code tests: reproducibility, stream independence, bounds, baseline equivalence, per-seed balance.
const assert = require('assert');
const G = p => require('../game/' + p);
const SC = G('scenario.js'), SW = G('engine.js'), WF = G('wildfire-engine.js'), FL = G('flood-engine.js');
const KEYS = ['instrument', 'observation', 'power', 'comms', 'storage'];
const designOf = hw => { const d = {}; KEYS.forEach((k, i) => d[k] = (hw >> i) & 1 ? 'adv' : 'std'); return d; };
const MIS = {
  storm: { ch: SW.CHALLENGES, valid: d => SW.designTotals(d, SW.makeConfig('v35')).valid, run: (d, dec, scn) => SW.runFull(d, dec, 'v35', scn) },
  fire: { ch: WF.CHALLENGES, valid: d => WF.totals(d).valid, run: (d, dec, scn) => WF.runFull(d, dec, scn) },
  flood: { ch: FL.challengesFor(FL.makeConfig('v42')), valid: d => FL.totals(d, FL.makeConfig('v42')).valid, run: (d, dec, scn) => FL.runFull(d, dec, 'v42', scn) },
};
const decOf = (m, dec) => MIS[m].ch.map((c, ci) => { const b = (dec >> (ci * 2)) & 3; return c.controls.map((o, gi) => o[(b >> gi) & 1]); });
const sig = r => JSON.stringify([r.s.total, r.s.outcome, r.s.sci, r.s.del, r.s.eff, r.s.rel, r.s.gates]);
let n = 0; const t = (name, f) => { f(); n++; console.log('  ✓ ' + name); };
const SEEDS = ['7K3QX', 'AB2CD', 'ZZ999', 'M4RSH', 'Q8WNE'];

t('code parsing and formatting', () => {
  assert.deepStrictEqual(SC.parseCode(' storm-7k3qx ').code, 'STORM-7K3QX'); assert.strictEqual(SC.parseCode('FIRE-PRACTICE').seed, 'PRACTICE');
  assert.strictEqual(SC.parseCode('STORM-0O1I5'), null); assert.strictEqual(SC.parseCode('hello'), null);
});
t('same code -> identical scenario (generation is pure)', () => {
  for (const m of Object.keys(MIS)) for (const s of SEEDS) assert.deepStrictEqual(SC.generate(m, s), SC.generate(m, s));
});
t('same code + design + decisions -> identical results', () => {
  for (const m of Object.keys(MIS)) for (const s of SEEDS) { const scn = SC.generate(m, s), d = designOf(0), dec = decOf(m, 77);
    assert.strictEqual(sig(MIS[m].run(d, dec, scn)), sig(MIS[m].run(d, dec, SC.generate(m, s)))); }
});
t('player decisions never change the external schedule', () => {
  for (const m of Object.keys(MIS)) { const scn = SC.generate(m, SEEDS[0]); const before = JSON.stringify(scn);
    for (const dec of [0, 85, 170, 255]) MIS[m].run(designOf(0), decOf(m, dec), scn); assert.strictEqual(JSON.stringify(scn), before); }
});
t('named streams are independent (changing one stream name does not alter the others)', () => {
  const a = SC.mulberry32(SC.hash32('1.0|storm|7K3QX|power'))(), b = SC.mulberry32(SC.hash32('1.0|storm|7K3QX|ground'))();
  assert.notStrictEqual(a, b);
});
t('generated parameters stay inside the documented ranges', () => {
  const R = SC.RANGES; const r = SC.mulberry32(42);
  for (let i = 0; i < 300; i++) { const s = SC.randomSeed(r);
    const a = SC.generate('storm', s).params; assert(R.storm.anomalySolar.includes(a.anomalySolar)); assert(a.link[0].from >= 1 && a.link[0].to <= 21 && a.link[0].factor === 0.5);
    assert(a.eclipseHour === null || R.storm.eclipseHours.includes(a.eclipseHour));
    const f = SC.generate('fire', s).params; assert(R.fire.anomalySolar.includes(f.anomalySolar)); assert(f.contactCut.index <= 3); assert(f.smoke === null || (f.smoke.factor === 0.85 && f.smoke.pass <= 2));
    const l = SC.generate('flood', s).params; assert(R.flood.anomalyFactor.includes(l.anomalyFactor)); assert(l.contactCut.index <= 6 && l.contactCut.minutes === 5); }
});
t('different seeds give meaningful variation', () => {
  const r = SC.mulberry32(7); for (const m of Object.keys(MIS)) { const set = new Set(); for (let i = 0; i < 100; i++) set.add(JSON.stringify(SC.generate(m, SC.randomSeed(r)).params)); assert(set.size >= 15, m + ' ' + set.size); }
});
t('Practice code reproduces the calibrated baseline exactly', () => {
  for (const m of Object.keys(MIS)) for (const dec of [0, 99, 255]) for (const hw of [0, 1, 8]) { const d = designOf(hw); if (!MIS[m].valid(d)) continue;
    assert.strictEqual(sig(MIS[m].run(d, decOf(m, dec), SC.generate(m, 'PRACTICE'))), sig(MIS[m].run(d, decOf(m, dec), undefined))); }
});
// per-seed exhaustive balance
const report = {};
t('every tested seed keeps all outcomes meaningful (exhaustive per seed)', () => {
  for (const m of Object.keys(MIS)) { report[m] = {};
    for (const s of ['PRACTICE'].concat(SEEDS)) { const scn = SC.generate(m, s); let S = 0, P = 0, F = 0, sum = 0, cnt = 0, c100 = 0; const win = new Set();
      for (let hw = 0; hw < 32; hw++) { const d = designOf(hw); if (!MIS[m].valid(d)) continue;
        for (let dec = 0; dec < 256; dec++) { const r = MIS[m].run(d, decOf(m, dec), scn).s; cnt++; sum += r.total; if (r.total === 100) c100++;
          if (r.outcome === 'Mission Success') { S++; win.add(hw); } else if (r.outcome === 'Partial Success') P++; else F++; } }
      report[m][s] = { success: S, partial: P, failure: F, mean: +(sum / cnt).toFixed(1), pct100: +(100 * c100 / cnt).toFixed(1), winningDesigns: win.size, events: scn.events.map(e => e.text) };
      assert(S > 0 && P > 0, `${m} ${s}: success ${S} partial ${P}`); assert(win.size >= 3, `${m} ${s}: winning designs ${win.size}`); } }
});
t('same code, one decision changed: external events identical, outcome may differ', () => {
  const scn = SC.generate('storm', SEEDS[1]); const a = MIS.storm.run(designOf(0), decOf('storm', 0), scn), b = MIS.storm.run(designOf(0), decOf('storm', 64), scn);
  assert.deepStrictEqual(a.M.scn, b.M.scn); assert.notStrictEqual(sig(a), sig(b));
});
console.log(`\n${n} seed tests passed`);
require('fs').writeFileSync(__dirname + '/seed_balance.json', JSON.stringify(report, null, 1));
for (const m of Object.keys(report)) { console.log('\n' + m); for (const [s, r] of Object.entries(report[m])) console.log(`  ${s.padEnd(9)} S/P/F ${r.success}/${r.partial}/${r.failure}  mean ${r.mean}  100s ${r.pct100}%  winning designs ${r.winningDesigns}`); }
