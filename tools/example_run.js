// Prints one real end-to-end example per mission from actual engine output:
// initial design -> result -> redesign -> same-code retry -> comparison. Run: node tools/example_run.js
const MD = require('../game/mission-design.js'), Sc = require('../game/scenario.js');
const STD = { instrument: 'std', observation: 'std', power: 'std', comms: 'std', storage: 'std' };
const CASES = [
  { m: 'storm', code: 'STORM-7K3QX', target: 'S3', dec: [['high', 'wide'], ['high', 'keep'], ['normal', 'freq'], ['std', 'full']], change: { comms: 'adv' } },
  { m: 'fire', code: 'FIRE-7K3QX', target: 'F1', dec: [['wide', 'high'], ['alerts', 'full'], ['normal', 'image'], ['wide', 'std']], change: { instrument: 'adv' } },
  { m: 'flood', code: 'FLOOD-7K3QX', target: 'L2', dec: [['high', 'wide'], ['raw', 'keep'], ['normal', 'full'], ['relay', 'full']], change: { comms: 'adv' } },
];
const fly = (c, design, dec, ext, arch) => { const p = Sc.parseCode(c.code), scn = Sc.generate(c.m, p.seed), r = MD.runFull(c.m, design, dec, scn, ext, arch); MD.attach(r.M, c.m, c.target, arch);
  return { r, scn, rec: MD.makeRecord({ mission: c.m, M: r.M, score: r.s, scn, targetId: c.target, archId: arch }), v: MD.verify(c.m, r.M, r.s, { targetId: c.target }) }; };
const show = (label, x) => { console.log(`  ${label}: ${x.rec.result.score} pts · ${x.rec.result.outcome}`); for (const g of x.v.gates.concat([x.v.target])) console.log(`    [${g.status}] ${g.kind === 'target' ? 'TARGET ' : ''}${g.requirement} — measured ${g.measured}. ${g.why}`); };
for (const c of CASES) { const t = MD.targetDef(c.m, c.target);
  console.log(`\n=== ${MD.NAME[c.m]} · ${c.code} · target ${t.id} "${t.title}" (${t.statement})`);
  const a = fly(c, STD, c.dec, null); console.log(`  Simulated events: ${a.scn.events.map(e => e.text).join(' | ')}`); console.log(`  Design Check (all Standard): ${MD.designCheck(c.m, STD).summary.slice(1).join(' — ')}`);
  show('ORIGINAL (all Standard)', a);
  const d2 = Object.assign({}, STD, c.change), k = Object.keys(c.change)[0], carry = MD.carry(c.m, a.rec, d2), note = MD.changeNote(c.m, STD, d2, c.target);
  console.log(`  REDESIGN: ${k} -> ${MD.runFull(c.m, d2, c.dec, null).M.P[k].name}. Builder note: ${note.text} Launch: ${MD.designCheck(c.m, d2).launch.message}`);
  const b = fly(c, d2, carry.decisions, carry.manipulations); show('REVISED (same code, same decisions)', b);
  console.log(`  Same external events: ${JSON.stringify(a.rec.simulatedEvents) === JSON.stringify(b.rec.simulatedEvents)} · both records replay: ${MD.replay(a.rec).matches && MD.replay(b.rec).matches}`);
  console.log('  COMPARISON'); for (const r of MD.compare(c.m, a.rec.summary, b.rec.summary)) console.log(`    ${r.label.padEnd(44)} ${String(r.a).padEnd(26)} -> ${r.b}${r.delta ? ` (${r.delta > 0 ? '+' : ''}${r.delta})` : ''}`);
  if (c.m === 'fire' && MD.fireArch('dawn-dusk-sso') && MD.fireArch('dawn-dusk-sso').id === 'dawn-dusk-sso') { const x = fly(c, STD, c.dec, null, 'dawn-dusk-sso'); show('ARCHITECTURE OPTION 2 (dawn-dusk orbit, all Standard, same code and decisions)', x);
    console.log('  ARCHITECTURE COMPARISON'); for (const r of MD.compare(c.m, a.rec.summary, x.rec.summary)) console.log(`    ${r.label.padEnd(44)} ${String(r.a).padEnd(26)} -> ${r.b}${r.delta ? ` (${r.delta > 0 ? '+' : ''}${r.delta})` : ''}`); } }
