// Exhaustive run of the CURRENT (shipped) Storm Watch simulate()/scoreCard().
const m = require('./old_engine.js');
const keys = ['instrument', 'observation', 'power', 'comms', 'storage'];
const lv = ['std', 'adv'];
const rows = [];
let invalid = 0;
for (let hw = 0; hw < 32; hw++) {
  const design = {}; keys.forEach((k, i) => design[k] = lv[(hw >> i) & 1]);
  let kg = 0, mm = 0; m.PARTS.forEach(p => { kg += p[design[p.key]].kg; mm += p[design[p.key]].m; });
  const valid = kg <= m.MAX_KG && mm <= m.MAX_M;
  for (let dec = 0; dec < 256; dec++) {
    if (!valid) { invalid++; continue; }
    m.S.design = design; m.resetOps();
    const o = m.S.ops;
    for (let ci = 0; ci < 4; ci++) {
      const bits = (dec >> (ci * 2)) & 3;
      o.choice[ci] = m.CH[ci].groups.map((g, gi) => g.opts[(bits >> gi) & 1][0]);
      o.ci = ci; m.simulate();
    }
    const s = m.scoreCard();
    rows.push({ hw, dec, design, total: s.total, sci: s.sci, tim: s.tim, res: s.res, rel: s.rel, success: s.success,
      pts: o.pts, cov: o.cov, batt: o.batt, health: o.health, critical: o.critical, overflow: o.overflow, minBatt: o.minBatt });
  }
}
module.exports = { rows, invalid };
if (require.main === module) {
  const n = rows.length;
  const c = f => rows.filter(f).length;
  const pct = x => (100 * x / n).toFixed(1) + '%';
  const tot = rows.map(r => r.total).sort((a, b) => a - b);
  console.log({ valid: n, invalid, success: c(r => r.success), notSuccess: c(r => !r.success),
    score100: c(r => r.total === 100), pct100: pct(c(r => r.total === 100)),
    min: tot[0], max: tot[n - 1], mean: (tot.reduce((a, b) => a + b, 0) / n).toFixed(2), median: tot[n >> 1],
    sciMax: pct(c(r => r.sci === 35)), timMax: pct(c(r => r.tim === 35)), resMax: pct(c(r => r.res === 20)), relMax: pct(c(r => r.rel === 10)),
    overflowEver: c(r => r.overflow), minBattLowest: Math.min(...rows.map(r => r.minBatt)), healthBelow100: c(r => r.health < 100),
    criticalMissed: c(r => r.critical !== 'Delivered') });
  const hist = {}; tot.forEach(t => hist[t] = (hist[t] || 0) + 1); console.log('score histogram', hist);
}
