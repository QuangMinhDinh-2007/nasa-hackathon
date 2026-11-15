// Replays copied mission records in Node and checks score and outcome. Run: node tools/replay_record.js rec.json [...]
// Accepts v6.3 records (no recordVersion) and v7.0 records (recordVersion 2: target, architecture, summary). A file may hold one record or an array.
const MD = require('../game/mission-design.js');
let bad = 0;
for (const f of process.argv.slice(2)) { const j = JSON.parse(require('fs').readFileSync(f, 'utf8'));
  for (const r of Array.isArray(j) ? j : [j]) { const out = MD.replay(r); if (!out.matches) bad++;
    const t = out.summary.target ? ` · target ${out.summary.target.id} ${out.summary.target.status} (${out.summary.target.text})` : '';
    console.log(`${out.matches ? '✓' : '✗'} ${r.mission} ${r.missionCode} v${r.recordVersion || 1}${r.architecture ? ' ' + r.architecture.id : ''}: record ${r.result.score} ${r.result.outcome} · replay ${out.s.total} ${out.s.outcome}${t}`); } }
process.exit(bad ? 1 : 0);
