// Interactive-control tests for Storm Watch v3.6: every direct control must change the real mission state.
const E = require('../game/engine.js'), Sc = require('../game/scenario.js');
let n = 0; const ok = (c, m) => { if (!c) { console.error('  ✗ ' + m); process.exit(1); } n++; console.log('  ✓ ' + m); };
const D0 = { instrument: 'std', observation: 'std', power: 'std', comms: 'std', storage: 'std' };
const ADV = { instrument: 'adv', observation: 'adv', power: 'adv', comms: 'std', storage: 'std' };
const dec = [['high', 'wide'], ['high', 'keep'], ['normal', 'freq'], ['fast', 'full']];
const run = (d, x, scn, dd) => E.runFull(d, dd || dec, 'v34', scn, x);
const sig = r => JSON.stringify([r.s.total, r.s.outcome, r.s.derived.deliveredScience.toFixed(6), r.M.battery.toFixed(6), r.M.records.length, r.s.eff.toFixed(6), r.s.derived.storedGB.toFixed(6)]);
// 1 presets untouched
let S = 0, P = 0, F = 0; const lv = ['std', 'adv'];
for (let i = 0; i < 32; i++) { const d = {}; ['instrument', 'observation', 'power', 'comms', 'storage'].forEach((k, j) => d[k] = lv[(i >> j) & 1]); if (!E.designTotals(d, E.makeConfig('v34')).valid) continue;
  for (let q = 0; q < 256; q++) { const dd = E.CHALLENGES.map((c, ci) => [c.controls[0][(q >> (ci * 2)) & 1], c.controls[1][(q >> (ci * 2 + 1)) & 1]]); const o = E.runFull(d, dd, 'v34').s.outcome; o === 'Mission Success' ? S++ : o === 'Partial Success' ? P++ : F++; } }
ok(S === 6292 && P === 1544 && F === 100, `no extensions -> original balance unchanged (${S}/${P}/${F})`);
// 2 box: full-disk box equals the Wide preset exactly
ok(sig(run(D0, [{ box: { x: .5, y: .5, w: 1 } }, null, null, null])) === sig(run(D0)), 'full-size scan box = Wide preset, identical result');
// 3 box position matters
const C = E.makeConfig('v34'), mid = E.trackPoint(C, 2.5, 0);
const aimed = run(D0, [{ box: { x: mid[0], y: mid[1], w: .5 } }, null, null, null]), off = run(D0, [{ box: { x: .8, y: .2, w: .5 } }, null, null, null]);
ok(aimed.M.chSnapshots[0].after.collectedScience > off.M.chSnapshots[0].after.collectedScience + 1, `aiming the box changes science collected (${aimed.M.chSnapshots[0].after.collectedScience.toFixed(2)} vs ${off.M.chSnapshots[0].after.collectedScience.toFixed(2)})`);
// 4 box size trades data volume for detail
const big = run(D0, [{ box: { x: mid[0], y: mid[1], w: .9 } }, null, null, null]);
ok(big.M.chSnapshots[0].captured[0].sizeGB > aimed.M.chSnapshots[0].captured[0].sizeGB && big.M.chSnapshots[0].captured[0].quality < aimed.M.chSnapshots[0].captured[0].quality, 'bigger box -> larger files, lower detail');
// 5 forecast error: the same tight box scores differently when the storm drifts
const scn = d => ({ id: 'x', params: { anomalySolar: .35, link: [], eclipseHour: null, trackDev: d } });
const tight = [{ box: { x: mid[0], y: mid[1], w: .5 } }, null, null, null];
ok(run(D0, tight, scn(0)).M.chSnapshots[0].after.collectedScience > run(D0, tight, scn(1)).M.chSnapshots[0].after.collectedScience, 'storm drifting off the forecast line lowers what a tight box sees');
// 6 a box covering the whole cone is safe for every drift
const cone = [{ box: { x: mid[0], y: mid[1], w: .86 } }, null, null, null];
ok([-1, -.5, 0, .5, 1].every(d => Math.abs(run(D0, cone, scn(d)).M.chSnapshots[0].after.collectedScience - run(D0, cone, scn(0)).M.chSnapshots[0].after.collectedScience) < 1e-9), 'a box covering the whole cone sees the storm for every drift');
// 7 triage: discard frees storage and loses that data
const base = run(ADV), M1 = E.newMission(ADV, 'v34'); E.runChallenge(M1, 0, dec[0]);
const onboard = M1.records.filter(r => r.status === 'stored').map(r => r.id);
ok(onboard.length >= 2, `backlog exists for a data-heavy design (${onboard.length} packets on board at 06:00)`);
const dropped = run(ADV, [null, { drop: [onboard[0]] }, null, null]);
ok(dropped.M.records.find(r => r.id === onboard[0]).lostReason === 'discarded' && sig(dropped) !== sig(base), 'discarding a packet marks it lost, frees storage, and changes the mission state');
// 8 triage: transmit-first changes delivery order
const last = onboard[onboard.length - 1], first = run(ADV, [null, { first: [last] }, null, null]);
const dAt = (r, id) => { const x = r.M.records.find(q => q.id === id); return x.deliveredAt == null ? 99 : x.deliveredAt; };
ok(dAt(first, last) < dAt(base, last), `"transmit first" delivers that packet earlier (${dAt(first, last).toFixed(2)} h vs ${dAt(base, last) === 99 ? 'never' : dAt(base, last).toFixed(2) + ' h'})`);
// 9 schedule: presets reproduced, and rest hours save battery
const all = m => [null, null, { sched: Array(6).fill(m) }, null];
ok(sig(run(D0, all('full'))) === sig(run(D0)), 'schedule of six "full" hours = Normal + Frequent preset');
ok(sig(run(D0, all('eco'))) === sig(run(D0, null, null, [dec[0], dec[1], ['save', 'freq'], dec[3]])), 'schedule of six "eco" hours = Power-save + Frequent preset');
const rest = run(ADV, all('rest')), full = run(ADV, all('full'));
ok(rest.M.chSnapshots[2].battAfterKWh > full.M.chSnapshots[2].battAfterKWh && rest.M.chSnapshots[2].captured.length === 0, 'resting all six hours keeps more battery and captures nothing');
const mixed = run(ADV, [null, null, { sched: ['full', 'rest', 'eco', 'rest', 'one', 'full'] }, null]);
ok(sig(mixed) !== sig(rest) && sig(mixed) !== sig(full), 'a mixed schedule gives its own result');
// 10 emergency downlink
const M3 = E.newMission(ADV, 'v34'); for (let i = 0; i < 3; i++) E.runChallenge(M3, i, dec[i]);
const ob3 = M3.records.filter(r => r.status === 'stored').map(r => r.id);
const dstd = dec;
const noNew = run(ADV, [null, null, null, { order: ob3, newFirst: false }], null, dstd), yesNew = run(ADV, [null, null, null, { order: ob3, newFirst: true }], null, dstd);
ok(ob3.length >= 2 && yesNew.s.gates.G3 && !noNew.s.gates.G3, `with a backlog of ${ob3.length}, sending old packets before new storm images misses the critical update`);
const rev = run(ADV, [null, null, null, { order: ob3.slice().reverse(), newFirst: true }], null, dstd);
ok(sig(rev) !== sig(yesNew) || ob3.length < 2, 'packet order changes delivered value');
// 11 determinism with extensions + Mission Code
const sc = Sc.generate('storm', '7K3QX'), X = [{ box: { x: .5, y: .5, w: .6 } }, { first: [2] }, { sched: ['full', 'eco', 'rest', 'one', 'full', 'eco'] }, { order: [], newFirst: true }];
ok(sig(run(ADV, X, sc)) === sig(run(ADV, X, sc)) && [-1, -.5, 0, .5, 1].includes(sc.params.trackDev), 'same code + same manipulations -> identical result; track drift is inside its documented range');
console.log(`\n${n} interaction tests passed`);
// ---------- Wildfire and Flood direct tasking ----------
{ const W = require('../game/wildfire-engine.js'), F = require('../game/flood-engine.js'); let m = 0; const ok2 = (c, t) => { if (!c) { console.error('  ✗ ' + t); process.exit(1); } m++; console.log('  ✓ ' + t); };
  const d = { instrument: 'std', observation: 'std', power: 'std', comms: 'std', storage: 'std' }, sg = r => JSON.stringify([r.s.total, r.s.outcome, r.s.sci.toFixed(6), r.s.del.toFixed(6), r.s.eff.toFixed(6)]);
  const fw = [['wide', 'std'], ['alerts', 'full'], ['normal', 'image'], ['wide', 'std']], ft = [['targeted', 'std'], ['alerts', 'full'], ['normal', 'image'], ['targeted', 'std']];
  const ABC = { regions: ['A', 'B', 'C'] }, A = { regions: ['A'] };
  ok2(sg(W.runFull(d, ft, null, [ABC, null, null, ABC])) === sg(W.runFull(d, fw)), 'Wildfire: targeting all three regions = Wide preset');
  ok2(sg(W.runFull(d, fw, null, [A, null, null, A])) === sg(W.runFull(d, ft)), 'Wildfire: targeting region A only = Targeted preset');
  const variants = [['B'], ['C'], ['B', 'C'], ['A', 'C'], ['A', 'B']].map(r => sg(W.runFull(d, fw, null, [{ regions: r }, { regions: r }, { regions: r }, { regions: r }])));
  ok2(new Set(variants.concat([sg(W.runFull(d, fw)), sg(W.runFull(d, ft))])).size >= 4, `Wildfire: other region choices give their own results (${new Set(variants).size} distinct of 5)`);
  const lw = [['std', 'wide'], ['raw', 'keep'], ['normal', 'full'], ['ground', 'full']], lf = [['std', 'focused'], ['raw', 'keep'], ['normal', 'full'], ['ground', 'full']], C = F.makeConfig('v41');
  const all = [0, 1, 2, 3].map(() => ({ zones: ['ALL', 'ALL'] })), tg = [0, 1, 2, 3].map(i => ({ zones: C.targets[i].slice() }));
  ok2(sg(F.runFull(d, lf, 'v41', null, all)) === sg(F.runFull(d, lw, 'v41')), 'Flood: aiming every pass at all zones = Wide preset');
  ok2(sg(F.runFull(d, lw, 'v41', null, tg)) === sg(F.runFull(d, lf, 'v41')), 'Flood: aiming each pass at the original targets = Focused preset');
  const town = [0, 1, 2, 3].map(() => ({ zones: ['TOWN', 'TOWN'] })), r = F.runFull(d, lw, 'v41', null, town);
  ok2(sg(r) !== sg(F.runFull(d, lw, 'v41')) && !r.s.gates.G2, 'Flood: aiming only at the town changes the result and fails the all-zones requirement');
  console.log(`\n${m} tasking tests passed`); }
