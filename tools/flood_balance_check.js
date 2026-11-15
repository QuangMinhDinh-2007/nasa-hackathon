const E = require('../game/flood-engine.js');
const KEYS = ['instrument', 'observation', 'power', 'comms', 'storage'];
const designOf = hw => { const d = {}; KEYS.forEach((k, i) => d[k] = (hw >> i) & 1 ? 'adv' : 'std'); return d; };
function run(profile) {
  const C = E.makeConfig(profile), CH = E.challengesFor(C); const rows = []; let invalid = 0;
  const decOf = dec => CH.map((ch, ci) => { const b = (dec >> (ci * 2)) & 3; return ch.controls.map((o, gi) => o[(b >> gi) & 1]); });
  for (let hw = 0; hw < 32; hw++) { const d = designOf(hw); if (!E.totals(d, C).valid) { invalid += 256; continue; }
    for (let dec = 0; dec < 256; dec++) { const { M, s } = E.runFull(d, decOf(dec), profile); rows.push({ hw, dec, d, decisions: decOf(dec), s, M }); } }
  return { rows, invalid, CH };
}
function summarize(profile) {
  const { rows, invalid, CH } = run(profile); const n = rows.length; const c = f => rows.filter(f).length; const p = x => +(100 * x / n).toFixed(1);
  const st = a => { a = a.slice().sort((x, y) => x - y); return [+a[0].toFixed(1), +a[a.length >> 2].toFixed(1), +a[a.length >> 1].toFixed(1), +a[(3 * a.length) >> 2].toFixed(1), +a[a.length - 1].toFixed(1)]; };
  const out = { profile, valid: n, invalid, designs: n / 256, success: c(r => r.s.outcome === 'Mission Success'), partial: c(r => r.s.outcome === 'Partial Success'), failure: c(r => r.s.outcome === 'Mission Failure'),
    pct100: p(c(r => r.s.total === 100)), score_min_q1_med_q3_max: st(rows.map(r => r.s.total)), mean: +(rows.reduce((a, r) => a + r.s.total, 0) / n).toFixed(1),
    atMax: { map: p(c(r => r.s.sci > 34.99)), del: p(c(r => r.s.del > 34.99)), eff: p(c(r => r.s.eff > 19.99)), rel: p(c(r => r.s.rel > 9.99)) },
    gates: { G1: p(c(r => r.s.gates.G1)), G2: p(c(r => r.s.gates.G2)), G3: p(c(r => r.s.gates.G3)), G4: p(c(r => r.s.gates.G4)) },
    minBatt: st(rows.map(r => r.M.minBatt)), safeRuns: c(r => r.M.safeSteps > 0), failedHW: c(r => r.M.failed) };
  const byKey = new Map(rows.map(r => [r.hw * 256 + r.dec, r]));
  out.sensitivity = [];
  for (let ci = 0; ci < 4; ci++) for (let gi = 0; gi < 2; gi++) { const bit = 1 << (ci * 2 + gi); let pr = 0, sc = 0, oc = 0, sA = 0, sB = 0;
    for (const r of rows) { if (r.dec & bit) continue; const o = byKey.get(r.hw * 256 + (r.dec | bit)); pr++; if (o.s.total !== r.s.total) sc++; if (o.s.outcome !== r.s.outcome) oc++;
      if (r.s.outcome === 'Mission Success') sA++; if (o.s.outcome === 'Mission Success') sB++; }
    out.sensitivity.push({ control: `C${ci + 1}.${gi + 1} ${CH[ci].controls[gi].join('/')}`, scoreChg: +(100 * sc / pr).toFixed(1), outcomeChg: +(100 * oc / pr).toFixed(1), successDeltaPts: +(100 * (sB - sA) / pr).toFixed(1) }); }
  const per = {}; rows.forEach(r => { const k = KEYS.map(x => r.d[x] === 'adv' ? 'A' : 's').join(''); per[k] = per[k] || { S: 0, P: 0, F: 0, best: 0, sum: 0, n: 0 }; const q = per[k];
    q.n++; q.sum += r.s.total; q.best = Math.max(q.best, r.s.total); q[r.s.outcome === 'Mission Success' ? 'S' : r.s.outcome === 'Partial Success' ? 'P' : 'F']++; });
  out.perDesign = Object.fromEntries(Object.entries(per).map(([k, v]) => [k, `${v.S}/${v.P}/${v.F} best ${v.best} mean ${(v.sum / v.n).toFixed(1)}`]));
  return { out, rows };
}
module.exports = { run, summarize, designOf, KEYS };
if (require.main === module) { const { out } = summarize(process.argv[2] || 'v41'); const { sensitivity, perDesign, ...rest } = out; console.log(JSON.stringify(rest)); console.table(sensitivity); console.table(perDesign); }
