// Replays a copied mission record in Node and checks the score and outcome. Run: node tools/replay_record.js rec.json [...]
const Sc = require('../game/scenario.js'), E = { storm: require('../game/engine.js'), fire: require('../game/wildfire-engine.js'), flood: require('../game/flood-engine.js') };
let bad = 0;
for (const f of process.argv.slice(2)) { const r = JSON.parse(require('fs').readFileSync(f, 'utf8')), p = Sc.parseCode(r.missionCode), scn = Sc.generate(p.mission, p.seed);
  const out = r.mission === 'fire' ? E.fire.runFull(r.design, r.decisions, scn, r.manipulations) : r.mission === 'flood' ? E.flood.runFull(r.design, r.decisions, 'v41', scn, r.manipulations) : E.storm.runFull(r.design, r.decisions, undefined, scn, r.manipulations);
  const ok = out.s.total === r.result.score && out.s.outcome === r.result.outcome; if (!ok) bad++;
  console.log(`${ok ? '✓' : '✗'} ${r.mission} ${r.missionCode}: record ${r.result.score} ${r.result.outcome} · replay ${out.s.total} ${out.s.outcome}`); }
process.exit(bad ? 1 : 0);
