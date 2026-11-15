// Exhaustive run of all 32 hardware x 256 decision sequences for a given engine profile.
const E = require('../game/engine.js');
const KEYS = ['instrument', 'observation', 'power', 'comms', 'storage'];

function designOf(hw) { const d = {}; KEYS.forEach((k, i) => d[k] = (hw >> i) & 1 ? 'adv' : 'std'); return d; }
function decisionsOf(dec) {
  return E.CHALLENGES.map((ch, ci) => { const b = (dec >> (ci * 2)) & 3; return ch.controls.map((opts, gi) => opts[(b >> gi) & 1]); });
}

function runAll(profile) {
  const C = E.makeConfig(profile);
  const rows = []; let invalid = 0;
  for (let hw = 0; hw < 32; hw++) {
    const design = designOf(hw);
    if (!E.designTotals(design, C).valid) { invalid += 256; continue; }
    for (let dec = 0; dec < 256; dec++) {
      const decisions = decisionsOf(dec);
      const { M, s } = E.runFull(design, decisions, profile);
      const d = s.derived;
      rows.push({ hw, dec, design, decisions, total: s.total, sci: s.sci, del: s.del, eff: s.eff, rel: s.rel, outcome: s.outcome, gates: s.gates,
        collected: d.collectedScience, delivered: d.deliveredScience, deliveredRaw: d.deliveredRaw, coveredPhases: d.coveredPhases,
        battery: d.batteryPct, storage: d.storagePct, health: d.health, critical: d.critical, lost: d.nLost, missed: d.missedCaptures,
        onboard: d.nOnboard, meanLatency: d.meanLatency, effDetail: s.effDetail, essentialHours: M.essentialHours, minBattPct: null });
    }
  }
  return { rows, invalid };
}

function stats(arr) {
  const a = arr.slice().sort((x, y) => x - y), n = a.length;
  return { min: +a[0].toFixed(2), max: +a[n - 1].toFixed(2), mean: +(a.reduce((p, c) => p + c, 0) / n).toFixed(2), median: +a[n >> 1].toFixed(2) };
}
function hist(arr, edges) {
  const h = {}; edges.forEach((e, i) => { if (i < edges.length - 1) h[`${e}-${edges[i + 1] - 1}`] = 0; });
  arr.forEach(v => { for (let i = 0; i < edges.length - 1; i++) if (v >= edges[i] && v < edges[i + 1]) { h[`${edges[i]}-${edges[i + 1] - 1}`]++; break; } });
  return h;
}

// how often a single control flip changes the outcome / total score
function counterfactualSensitivity(rows) {
  const byKey = new Map(rows.map(r => [r.hw * 256 + r.dec, r]));
  const res = [];
  for (let ci = 0; ci < 4; ci++) for (let gi = 0; gi < 2; gi++) {
    const bit = 1 << (ci * 2 + gi); let pairs = 0, scoreChanged = 0, outcomeChanged = 0, deliveredChanged = 0;
    for (const r of rows) {
      if (r.dec & bit) continue; const o = byKey.get(r.hw * 256 + (r.dec | bit)); if (!o) continue;
      pairs++; if (o.total !== r.total) scoreChanged++; if (o.outcome !== r.outcome) outcomeChanged++;
      if (Math.abs(o.delivered - r.delivered) > 1e-6) deliveredChanged++;
    }
    res.push({ control: `C${ci + 1}.${gi + 1} ${E.CHALLENGES[ci].controls[gi].join('/')}`, pairs,
      scoreChangedPct: +(100 * scoreChanged / pairs).toFixed(1), outcomeChangedPct: +(100 * outcomeChanged / pairs).toFixed(1),
      deliveredChangedPct: +(100 * deliveredChanged / pairs).toFixed(1) });
  }
  return res;
}

function summarize(profile) {
  const { rows, invalid } = runAll(profile);
  const n = rows.length, c = f => rows.filter(f).length, pct = x => +(100 * x / n).toFixed(1);
  const out = {
    profile, valid: n, invalid, validDesigns: n / 256,
    outcomes: { success: c(r => r.outcome === 'Mission Success'), partial: c(r => r.outcome === 'Partial Success'), failure: c(r => r.outcome === 'Mission Failure') },
    score: stats(rows.map(r => r.total)), pct100: pct(c(r => r.total === 100)),
    scoreHist: hist(rows.map(r => r.total), [0, 50, 60, 70, 80, 90, 95, 100, 101]),
    categories: { sci: stats(rows.map(r => r.sci)), del: stats(rows.map(r => r.del)), eff: stats(rows.map(r => r.eff)), rel: stats(rows.map(r => r.rel)) },
    categoryAtMaxPct: { sci: pct(c(r => r.sci > 34.995)), del: pct(c(r => r.del > 34.995)), eff: pct(c(r => r.eff > 19.995)), rel: pct(c(r => r.rel > 9.995)) },
    resources: { collected: stats(rows.map(r => r.collected)), delivered: stats(rows.map(r => r.delivered)), battery: stats(rows.map(r => r.battery)),
      storage: stats(rows.map(r => r.storage)), health: stats(rows.map(r => r.health)), lostImages: stats(rows.map(r => r.lost)),
      missedCaptures: stats(rows.map(r => r.missed)), coveredPhases: stats(rows.map(r => r.coveredPhases)) },
    criticalDeliveredPct: pct(c(r => r.critical)),
    gatePassPct: { G1: pct(c(r => r.gates.G1)), G2: pct(c(r => r.gates.G2)), G3: pct(c(r => r.gates.G3)), G4: pct(c(r => r.gates.G4)) },
    sensitivity: counterfactualSensitivity(rows),
  };
  // per-design success counts (dominance check)
  const perDesign = {};
  rows.forEach(r => { const k = KEYS.map(x => r.design[x] === 'adv' ? 'A' : 's').join(''); perDesign[k] = perDesign[k] || { success: 0, partial: 0, failure: 0, best: 0, mean: 0, n: 0 };
    const p = perDesign[k]; p.n++; p.mean += r.total; p.best = Math.max(p.best, r.total);
    if (r.outcome === 'Mission Success') p.success++; else if (r.outcome === 'Partial Success') p.partial++; else p.failure++; });
  Object.values(perDesign).forEach(p => p.mean = +(p.mean / p.n).toFixed(1));
  out.perDesign = perDesign;
  return { out, rows };
}

module.exports = { runAll, summarize, designOf, decisionsOf, KEYS };
if (require.main === module) {
  const prof = process.argv[2] || 'v34';
  const { out } = summarize(prof);
  console.log(JSON.stringify(out, null, 1));
}
