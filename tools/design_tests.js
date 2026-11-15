// v7.0 Mission Design tests: student target, launch compatibility, Design Check, verification, redesign & retry, records.
// Pure Node, real engines. Run: node tools/design_tests.js
const fs = require('fs'), path = require('path'), assert = require('assert');
const MD = require('../game/mission-design.js'), Sc = require('../game/scenario.js');
const SW = require('../game/engine.js'), WF = require('../game/wildfire-engine.js'), FL = require('../game/flood-engine.js');
const K = MD.PARTS, STD = { instrument: 'std', observation: 'std', power: 'std', comms: 'std', storage: 'std' };
const designs = () => { const o = []; for (let i = 0; i < 32; i++) { const d = {}; K.forEach((k, j) => d[k] = (i >> j) & 1 ? 'adv' : 'std'); o.push(d); } return o; };
const decsOf = m => { const ch = MD.challenges(m), o = []; for (let q = 0; q < 256; q++) o.push(ch.map((c, ci) => [c.controls[0][(q >> (ci * 2)) & 1], c.controls[1][(q >> (ci * 2 + 1)) & 1]])); return o; };
const J = x => JSON.stringify(x, (k, v) => v instanceof Set ? [...v] : v === Infinity ? 'Infinity' : v);
const scoreSig = s => J([s.total, s.outcome, s.sci, s.del, s.eff, s.rel, s.gates]);
const FIX = require('./fixtures/records_v63.json');
let n = 0; const t = (name, f) => { f(); n++; console.log('  ✓ ' + name); };
const sample = (m, step) => { const out = []; let i = 0; for (const d of designs()) { if (!MD.totals(m, d).valid) continue; for (const dd of decsOf(m)) if (i++ % step === 0) out.push([d, dd]); } return out; };

console.log('Student target');
t('each mission offers 2–3 targets with unit, definition, verification rule, source and class D label', () => { for (const m of MD.MISSIONS) { assert.ok(MD.TARGETS[m].length >= 2 && MD.TARGETS[m].length <= 3);
  for (const x of MD.TARGETS[m]) { for (const f of ['id', 'title', 'statement', 'unit', 'definition', 'verify', 'source', 'demands']) assert.ok(typeof x[f] === 'string' && x[f].length >= 2, `${x.id}.${f}`); assert.strictEqual(x.cls, 'D'); assert.ok(typeof x.threshold === 'number' && ['<=', '>='].includes(x.op)); } } });
t('the target is stored in the mission state and the record with all required fields, and survives the whole mission', () => { for (const m of MD.MISSIONS) { const tid = MD.TARGETS[m][1].id, scn = Sc.generate(m, '7K3QX'), dec = decsOf(m)[37];
  const M = m === 'storm' ? SW.newMission(STD, 'v34', scn) : m === 'fire' ? WF.newMission(STD, scn) : FL.newMission(STD, 'v41', scn); MD.attach(M, m, tid);
  const E = m === 'storm' ? SW : m === 'fire' ? WF : FL; for (let ci = 0; ci < 4; ci++) E.runChallenge(M, ci, dec[ci]);
  const r = M.requirement; assert.strictEqual(r.mission, m); assert.strictEqual(r.target.id, tid); assert.strictEqual(r.definitionVersion, MD.DEF_VERSION); assert.strictEqual(r.mandatory.length, 4);
  for (const f of ['threshold', 'unit', 'definition', 'measurementSource', 'relevantParts', 'relevantChallenges']) assert.ok(r.target[f] !== undefined, f);
  const rec = MD.makeRecord({ mission: m, M, scn, targetId: tid }); assert.deepStrictEqual(rec.requirement, r); assert.strictEqual(rec.summary.target.id, tid); assert.strictEqual(rec.recordVersion, 2); } });
t('choosing any target (or none) never changes score, gates or outcome', () => { for (const m of MD.MISSIONS) for (const [d, dd] of sample(m, 97)) { const base = scoreSig(MD.runFull(m, d, dd, null).s);
  for (const x of MD.TARGETS[m]) { const r = MD.runFull(m, d, dd, null); MD.attach(r.M, m, x.id); MD.evaluateTarget(m, x.id, r.M); MD.verify(m, r.M, r.s, { targetId: x.id }); assert.strictEqual(scoreSig(MD.score(m, r.M)), base); } } });
t('targets are evaluated from real engine timestamps and ledgers (independent recomputation agrees)', () => {
  const ind = { S1: M => { const c = M.records.filter(r => r.status === 'delivered' && r.phase === 3 && r.qualifies).map(r => r.deliveredAt); return c.length > 0 && Math.min(...c) <= 20 + 1e-9; },
    S2: M => new Set(M.records.filter(r => r.status === 'delivered' && r.qualifies).map(r => r.phase)).size === 4,
    S3: M => { const l = M.records.filter(r => r.status === 'delivered').map(r => r.deliveredAt - r.t); return l.length > 0 && l.reduce((a, b) => a + b, 0) / l.length <= 2 + 1e-9; },
    F1: M => M.detected.size >= 6, F2: M => { const a = M.items.filter(i => i.kind === 'alert'); return a.length > 0 && a.every(x => x.status === 'delivered' && x.deliveredAt - x.t <= 2 + 1e-9); },
    F3: M => new Set(M.items.filter(i => i.kind === 'image' && i.status === 'delivered' && i.qualifies).map(i => i.pass)).size === 4,
    L1: M => { const z = new Set(); M.items.filter(i => i.status === 'delivered').forEach(i => i.zones.forEach(q => { if (i.zoneScore[q] >= 0.5 - 1e-9) z.add(q); })); return z.size === 3; },
    L2: M => { const a = M.items.filter(i => i.status === 'delivered' && i.townQual).map(i => (i.deliveredAt - i.t) * 60); return a.length > 0 && Math.min(...a) <= 30 + 1e-9; },
    L3: M => M.items.filter(i => i.status === 'delivered' && i.zones.some(q => i.zoneScore[q] >= 0.5 - 1e-9)).length >= 6 };
  for (const m of MD.MISSIONS) { const seen = {}; for (const scnId of ['PRACTICE', 'AB2CD']) for (const [d, dd] of sample(m, 23)) { const r = MD.runFull(m, d, dd, Sc.generate(m, scnId));
    for (const x of MD.TARGETS[m]) { const e = MD.evaluateTarget(m, x.id, r.M); assert.strictEqual(e.status === 'Met', ind[x.id](r.M), x.id); (seen[x.id] = seen[x.id] || new Set()).add(e.status); } }
    for (const x of MD.TARGETS[m]) assert.strictEqual(seen[x.id].size, 2, `${x.id} is both reachable and missable`); } });
t('changing a real delivery timestamp changes the target result (it is measured, not looked up)', () => { const r = MD.runFull('storm', Object.assign({}, STD, { comms: 'adv' }), [['std', 'wide'], ['std', 'keep'], ['normal', 'freq'], ['fast', 'full']], null);
  assert.strictEqual(MD.evaluateTarget('storm', 'S1', r.M).status, 'Met'); r.M.records.filter(x => x.phase === 3).forEach(x => { if (x.deliveredAt) x.deliveredAt = 23.5; }); assert.strictEqual(MD.evaluateTarget('storm', 'S1', r.M).status, 'Not met'); });
t('a configuration threshold is never reported as a measurement: Wildfire alert time comes from alert timestamps', () => { const r = MD.runFull('fire', STD, [['wide', 'high'], ['alerts', 'full'], ['normal', 'image'], ['wide', 'std']], null), e = MD.evaluateTarget('fire', 'F2', r.M);
  const a = r.M.items.filter(i => i.kind === 'alert'); assert.ok(a.length > 0); assert.strictEqual(e.value, Math.max(...a.map(x => x.deliveredAt - x.t))); assert.notStrictEqual(e.value, WF.CONFIG.alertOnTimeH); });
t('missing evidence never yields Met', () => { const empty = { storm: SW.newMission(STD, 'v34', null), fire: WF.newMission(STD, null), flood: FL.newMission(STD, 'v41', null) };
  for (const m of MD.MISSIONS) for (const x of MD.TARGETS[m]) { const e = MD.evaluateTarget(m, x.id, empty[m]); assert.strictEqual(e.status, 'Not met', x.id); }
  for (const id of ['S1', 'S3']) assert.ok(MD.evaluateTarget('storm', id, empty.storm).noEvidence); assert.ok(MD.evaluateTarget('fire', 'F2', empty.fire).noEvidence); assert.ok(MD.evaluateTarget('flood', 'L2', empty.flood).noEvidence);
  assert.strictEqual(MD.evaluateTarget('storm', 'nope', empty.storm).status, 'Not applicable'); assert.strictEqual(MD.evaluateTarget('storm', 'S1', null).status, 'Not applicable'); });
t('a met target never turns a missed mandatory requirement into success', () => { let found = 0; for (const m of MD.MISSIONS) for (const [d, dd] of sample(m, 11)) { const r = MD.runFull(m, d, dd, null);
  for (const x of MD.TARGETS[m]) { const v = MD.verify(m, r.M, r.s, { targetId: x.id }); if (v.target.status === 'Met' && !v.mandatoryMet) { found++; assert.notStrictEqual(r.s.outcome, 'Mission Success'); assert.strictEqual(scoreSig(MD.score(m, r.M)), scoreSig(r.s)); } } } assert.ok(found > 50, 'cases exist: ' + found); });

console.log('Launch compatibility');
t('one fixed profile per mission: Storm GTO-class, Wildfire LEO, Flood LEO; limits come from the engines', () => { assert.ok(/GTO/.test(MD.LAUNCH.storm.name) && /geostationary transfer/.test(MD.LAUNCH.storm.orbit)); assert.ok(/low Earth orbit/.test(MD.LAUNCH.fire.orbit) && /low Earth orbit/.test(MD.LAUNCH.flood.orbit));
  assert.strictEqual(MD.launchCheck('storm', 1).maxKg, SW.makeConfig('v34').limits.kg); assert.strictEqual(MD.launchCheck('fire', 1).maxKg, WF.CONFIG.limits.kg); assert.strictEqual(MD.launchCheck('flood', 1).maxKg, FL.makeConfig('v41').limits.kg);
  assert.strictEqual(new Set(MD.MISSIONS.map(m => MD.launchCheck(m, 1).maxKg)).size, 3, 'no profile limit is reused for another orbit');
  for (const m of MD.MISSIONS) { assert.strictEqual(MD.LAUNCH[m].cls, 'D'); assert.ok(/Educational limit/.test(MD.LAUNCH[m].basis) && /not .*rocket/i.test(MD.LAUNCH[m].basis)); } });
t('too heavy fails with a plain message; compatible passes', () => { const heavy = { instrument: 'adv', observation: 'adv', power: 'adv', comms: 'adv', storage: 'adv' };
  for (const m of ['fire', 'flood']) { const c = MD.launchCheck(m, MD.totals(m, heavy).kg); assert.ok(!c.ok && /heavier than this launch can carry to its orbit/.test(c.message) && /Reduce mass/.test(c.message)); assert.ok(MD.launchCheck(m, MD.totals(m, STD).kg).ok); }
  assert.ok(MD.launchCheck('storm', 5192).ok && !MD.launchCheck('storm', 5193).ok); });
t('launch check agrees with the engine mass rule for all 96 designs, and Not Ready exactly when the engine says invalid', () => { for (const m of MD.MISSIONS) for (const d of designs()) { const tt = MD.totals(m, d), dc = MD.designCheck(m, d);
  assert.strictEqual(dc.launch.ok, tt.kg <= MD.limits(m).kg); assert.strictEqual(dc.canLaunch, tt.valid, `${m} ${J(d)}`); assert.strictEqual(dc.status === 'Not Ready', !tt.valid); } });
t('launch cost is not double-counted: budget = bus + five parts, exactly the engine total', () => { for (const m of MD.MISSIONS) for (const d of designs()) { const C = m === 'storm' ? SW.makeConfig('v34') : m === 'fire' ? WF.CONFIG : FL.makeConfig('v41'), f = m === 'fire' ? 'credits' : 'costM';
  const sum = C.bus[f] + K.reduce((a, k) => a + C.parts[k][d[k]][f], 0), dc = MD.designCheck(m, d); assert.strictEqual(dc.totals.cost, sum); assert.strictEqual(dc.rows.filter(r => /budget/i.test(r.label)).length, 1); assert.ok(!dc.rows.some(r => /launch cost/i.test(r.label))); } });

console.log('Design Check');
t('agrees with the v6.3 readiness review for every design (same values, same Ready/Caution, same block rule)', () => { const src = fs.readFileSync(path.join(__dirname, 'fixtures/review_v63.js'), 'utf8');
  const CFG = SW.makeConfig('v34'), WC = WF.CONFIG, LC = FL.makeConfig('v41'), S = { scn: { storm: { code: 'x' }, fire: { code: 'x' }, flood: { code: 'x' } } }; let html = '';
  const tot = (m, d) => MD.totals(m, d), cur = {};
  const MX = { storm: { name: 's', design: () => cur.d }, fire: { name: 'f', design: () => cur.d }, flood: { name: 'l', design: () => cur.d } };
  const old = new Function('document', 'MX', 'CFG', 'WC', 'LC', 'S', 'totals', 'fTotals', 'lTotals', 'MAX_KG', 'MAX_M', 'fmt', '$', 'mrr', src + ';return mrr;')({ head: { insertAdjacentHTML() {} } }, MX, CFG, WC, LC, S,
    () => { const x = tot('storm', cur.d); return { kg: x.kg, m: x.cost }; }, () => { const x = tot('fire', cur.d); return { kg: x.kg, cr: x.cost }; }, () => { const x = tot('flood', cur.d); return { kg: x.kg, m: x.cost }; }, CFG.limits.kg, CFG.limits.costM, x => (Math.round(x * 10) / 10).toString(), () => ({ set innerHTML(v) { html = v; } }), null);
  const MAP = { 'Data made vs. sent (per 6 h)': 'flow', 'Storage fills in': 'storage', 'Battery backup': 'battery', 'Power during solar fault': 'fault', 'Data per pass vs. one contact': 'flow', 'Fire detection strength': 'detect', 'Usable passes': 'passes', 'Storage space': 'storage' }; let rowsChecked = 0;
  for (const m of MD.MISSIONS) for (const d of designs()) { cur.d = d; old(m); const dc = MD.designCheck(m, d);
    const rows = [...html.matchAll(/<tr><td>(.*?)<\/td><td><b>(.*?)<\/b><\/td><td class="rv-st (\w+)"/g)].map(x => ({ label: x[1], val: x[2], st: x[3] }));
    const mb = rows.find(r => r.label === 'Mass and budget'); assert.strictEqual(mb.st === 'no', !dc.canLaunch);
    for (const r of rows) { const key = MAP[r.label]; if (!key) continue; const mine = dc.rows.find(x => x.key === key); assert.strictEqual(mine.st, r.st, `${m} ${r.label}`); assert.strictEqual(mine.val, r.val, `${m} ${r.label}`); rowsChecked++; }
    assert.strictEqual(/disabled/.test(html.split('goLaunch')[1]), !dc.canLaunch); }
  assert.ok(rowsChecked > 300); });
t('Not Ready only for hard constraints; risky-but-feasible designs are Caution and can still launch', () => { for (const m of MD.MISSIONS) for (const d of designs()) { const dc = MD.designCheck(m, d);
  assert.ok(dc.hard.every(r => r.kind === 'feasibility')); assert.ok(dc.cautions.every(r => r.kind === 'risk')); if (dc.status === 'Caution') assert.ok(dc.canLaunch);
  for (const r of dc.hard.concat(dc.cautions)) assert.ok(r.risk.length > 10 && r.cause.length > 10, 'every risk has an explanation and a cause'); }
  assert.ok(MD.MISSIONS.every(m => designs().some(d => MD.designCheck(m, d).status === 'Caution'))); });
t('reveals no hidden Mission Code events and does not predict the outcome', () => { const f = MD.designCheck.toString(); assert.ok(!/scn|Scenario|Sc\.|generate\(/.test(f), 'designCheck has no access to scenarios');
  for (const m of MD.MISSIONS) { const dc = MD.designCheck(m, STD), txt = J(dc); assert.ok(/does not know your Mission Code/.test(dc.scope) && /does not predict/.test(dc.scope));
    assert.ok(!/Mission Success|Partial Success|Mission Failure|score/i.test(txt)); const pct = m === 'storm' ? 35 : m === 'fire' ? 15 : 25; assert.ok(dc.rows.find(r => r.key === 'fault').note.includes(pct + '%'), 'fault check uses the published practice case'); } });
t('builder links use engine values only; the target note is the real engine tested under practice conditions', () => { for (const m of MD.MISSIONS) for (const k of K) for (const v of ['std', 'adv']) { const d = Object.assign({}, STD, { [k]: v }), L = MD.partLink(m, d, k), o = (m === 'storm' ? SW.makeConfig('v34') : m === 'fire' ? WF.CONFIG : FL.makeConfig('v41')).parts[k][v];
    for (const f of ['gives', 'uses', 'supports', 'harder']) assert.ok(L[f].length > 10); assert.ok(L.uses.includes(`${o.kg} kg`)); assert.ok(!/optimal|best design|recommended/i.test(J(L))); }
  const a = MD.targetReach('storm', STD, 'S3'), b = MD.targetReach('storm', Object.assign({}, STD, { comms: 'adv' }), 'S3'); assert.ok(b > a);
  assert.strictEqual(MD.changeNote('storm', STD, Object.assign({}, STD, { comms: 'adv' }), 'S3').dir, 'easier'); assert.strictEqual(MD.changeNote('storm', Object.assign({}, STD, { comms: 'adv' }), STD, 'S3').dir, 'harder');
  assert.strictEqual(MD.changeNote('fire', STD, { instrument: 'adv', observation: 'adv', power: 'adv', comms: 'adv', storage: 'adv' }, 'F1').dir, 'blocked'); });

console.log('Requirements verification');
t('gate status always equals the engine gate; evidence, why and causal chain are present for every row', () => { for (const m of MD.MISSIONS) for (const [d, dd] of sample(m, 13)) { const r = MD.runFull(m, d, dd, Sc.generate(m, 'M4RSH')), v = MD.verify(m, r.M, r.s, { targetId: MD.TARGETS[m][0].id });
  assert.strictEqual(v.gates.length, 4); v.gates.forEach(g => { assert.strictEqual(g.status === 'Met', !!r.s.gates[g.id], `${m} ${g.id}`); assert.ok(g.evidence.length > 0 && g.why.length > 10 && g.measured.length > 0); assert.ok(g.parts.length && g.challenges.length);
    for (const f of ['design', 'constraint', 'decision', 'outcome']) assert.ok(g.chain[f] && g.chain[f].length > 2, f); });
  assert.strictEqual(v.target.kind, 'target'); assert.ok(['Met', 'Not met'].includes(v.target.status)); assert.strictEqual(v.mandatoryMet, r.s.outcome === 'Mission Success' || (['G1', 'G2', 'G3', 'G4'].every(k => r.s.gates[k]))); } });
t('reported timestamps exist in the engine ledger (nothing invented)', () => { const r = MD.runFull('storm', STD, [['high', 'wide'], ['high', 'keep'], ['normal', 'freq'], ['fast', 'full']], null), g3 = MD.verify('storm', r.M, r.s).gates[2];
  const rec = r.M.records.filter(x => x.phase === 3 && x.qualifies && x.status === 'delivered').sort((a, b) => a.deliveredAt - b.deliveredAt)[0]; assert.ok(g3.evidence[0].includes(MD.hm(rec.t)) && g3.evidence[0].includes(MD.hm(rec.deliveredAt)));
  const f = MD.runFull('fire', STD, [['wide', 'high'], ['alerts', 'full'], ['normal', 'image'], ['wide', 'std']], null), g2 = MD.verify('fire', f.M, f.s).gates[1], al = f.M.items.find(i => i.kind === 'alert' && i.critical);
  assert.ok(al && g2.evidence.join(' ').includes(MD.hm(al.t)) && g2.evidence.join(' ').includes(MD.hm(al.deliveredAt)));
  const l = MD.runFull('flood', Object.assign({}, STD, { comms: 'adv' }), [['high', 'wide'], ['raw', 'keep'], ['normal', 'full'], ['relay', 'full']], null), g = MD.verify('flood', l.M, l.s).gates[2], tw = l.M.items.find(i => i.townQual && i.status === 'delivered');
  assert.ok(tw && g.evidence[0].includes(MD.hm(tw.deliveredAt))); });
t('no target chosen -> target row absent (Not applicable), gates unaffected', () => { const r = MD.runFull('flood', STD, decsOf('flood')[0], null), v = MD.verify('flood', r.M, r.s); assert.strictEqual(v.target, null); assert.strictEqual(v.gates.length, 4); });

console.log('Redesign & retry');
const scnOf = rec => { const p = Sc.parseCode(rec.missionCode); return Sc.generate(p.mission, p.seed); };
const mk = (m, code, design, dec, ext, tid) => { const p = Sc.parseCode(code), scn = Sc.generate(m, p.seed), r = MD.runFull(m, design, dec, scn, ext); return MD.makeRecord({ mission: m, M: r.M, score: r.s, scn, targetId: tid }); };
t('old v6.3 records (no version, no target, no architecture) still replay to the same score and outcome', () => { assert.strictEqual(FIX.length, 9); for (const rec of FIX) { assert.strictEqual(rec.recordVersion, undefined); const r = MD.replay(rec); assert.ok(r.matches, rec.missionCode);
  assert.strictEqual(+r.s.sci.toFixed(2), rec.result.science); assert.strictEqual(+r.s.del.toFixed(2), rec.result.delivery); assert.strictEqual(+r.s.eff.toFixed(2), rec.result.efficiency); assert.deepStrictEqual(r.s.gates, rec.result.gates); } });
t('same code + same design + same decisions -> identical results (v1 and v2 records, with and without direct controls)', () => { for (const rec of FIX) { const c = MD.carry(rec.mission, rec, rec.design); assert.deepStrictEqual(c.resets, []); assert.ok(!c.hardwareChanged && c.compatible);
  assert.deepStrictEqual(c.decisions, rec.decisions); assert.deepStrictEqual(c.manipulations, rec.manipulations);
  const a = MD.runFull(rec.mission, rec.design, c.decisions, scnOf(rec), c.manipulations), b = MD.runFull(rec.mission, rec.design, c.decisions, scnOf(rec), c.manipulations);
  assert.strictEqual(scoreSig(a.s), scoreSig(b.s)); assert.strictEqual(J(MD.summarize(rec.mission, a.M, a.s)), J(MD.summarize(rec.mission, b.M, b.s))); assert.strictEqual(a.s.total, rec.result.score); } });
t('same code + changed hardware -> same external events, re-computed outcome', () => { let changed = 0; for (const rec of FIX) for (const k of K) { const d2 = Object.assign({}, rec.design, { [k]: rec.design[k] === 'std' ? 'adv' : 'std' }); if (!MD.totals(rec.mission, d2).valid) continue;
  const c = MD.carry(rec.mission, rec, d2), scn = scnOf(rec), a = MD.runFull(rec.mission, rec.design, rec.decisions, scnOf(rec), rec.manipulations), b = MD.runFull(rec.mission, d2, c.decisions, scn, c.manipulations);
  assert.strictEqual(J(a.M.scn), J(b.M.scn), 'engine received identical external conditions'); assert.deepStrictEqual(scn.events.map(e => e.text), rec.simulatedEvents); assert.strictEqual(scn.id, rec.scenarioId);
  assert.strictEqual(b.M.design[k], d2[k]); if (scoreSig(a.s) !== scoreSig(b.s)) changed++; }
  assert.ok(changed >= 20, `hardware changes re-compute the outcome (${changed} of the tried changes gave a different result)`); });
t('hardware choices cannot change event generation: scenarios depend only on mission and seed', () => { for (const m of MD.MISSIONS) for (const seed of ['7K3QX', 'AB2CD', 'ZZ999']) { const a = J(Sc.generate(m, seed)); for (const d of designs().slice(0, 6)) { if (MD.totals(m, d).valid) MD.runFull(m, d, decsOf(m)[5], Sc.generate(m, seed)); assert.strictEqual(J(Sc.generate(m, seed)), a); } } });
t('the original run is preserved: carrying and re-flying never mutates the original record', () => { for (const rec of FIX) { const before = J(rec), d2 = Object.assign({}, rec.design, { storage: rec.design.storage === 'std' ? 'adv' : 'std' }), c = MD.carry(rec.mission, rec, d2);
  if (MD.totals(rec.mission, d2).valid) MD.runFull(rec.mission, d2, c.decisions, scnOf(rec), c.manipulations); c.decisions[0][0] = 'zzz'; if (c.manipulations) c.manipulations[0] = 'zzz'; assert.strictEqual(J(rec), before); } });
t('incompatible decisions are handled explicitly: image-numbered sorting is reset and reported, never silently reused', () => { const rec = FIX.find(r => r.missionCode === 'STORM-7K3QX'); assert.ok(rec.manipulations[1].first.length && rec.manipulations[1].drop.length);
  const same = MD.carry('storm', rec, rec.design); assert.deepStrictEqual(same.manipulations, rec.manipulations);
  const d2 = Object.assign({}, rec.design, { observation: 'adv' }), c = MD.carry('storm', rec, d2); assert.ok(c.hardwareChanged && !c.compatible); assert.strictEqual(c.manipulations[1], null); assert.ok(c.resets.length >= 1 && /Challenge 2/.test(c.resets[0]) && /automatic/.test(c.resets[0]));
  assert.deepStrictEqual(c.manipulations[0], rec.manipulations[0], 'scan box is hardware-independent and kept'); assert.deepStrictEqual(c.manipulations[2], rec.manipulations[2], 'hour plan kept'); assert.deepStrictEqual(c.decisions, rec.decisions);
  const q = JSON.parse(JSON.stringify(rec)); q.manipulations[3] = { order: [5, 3, 4], newFirst: false }; const c2 = MD.carry('storm', q, d2); assert.deepStrictEqual(c2.manipulations[3], { order: [], newFirst: false }); assert.strictEqual(c2.resets.length, 2);
  for (const r of FIX.filter(x => x.mission !== 'storm')) { const dd = Object.assign({}, r.design, { comms: r.design.comms === 'std' ? 'adv' : 'std' }), cc = MD.carry(r.mission, r, dd); assert.deepStrictEqual(cc.resets, []); assert.deepStrictEqual(cc.manipulations, r.manipulations); } });
t('comparison is built only from two real engine summaries (no fabricated numbers)', () => { const a = mk('flood', 'FLOOD-7K3QX', STD, decsOf('flood')[0], null, 'L1'), d2 = Object.assign({}, STD, { comms: 'adv' }), c = MD.carry('flood', a, d2), b = mk('flood', 'FLOOD-7K3QX', d2, c.decisions, c.manipulations, 'L1');
  const rows = MD.compare('flood', a.summary, b.summary), row = l => rows.find(r => r.label.startsWith(l)); assert.strictEqual(row('Total score').a, String(a.result.score)); assert.strictEqual(row('Total score').b, String(b.result.score)); assert.strictEqual(row('Outcome').b, b.result.outcome);
  assert.strictEqual(rows.filter(r => r.label.startsWith('Requirement')).length, 4); assert.ok(row('Your target')); assert.ok(row('Spacecraft mass').b.includes(String(b.summary.massKg))); assert.ok(MD.replay(a).matches && MD.replay(b).matches);
  assert.notStrictEqual(a.result.score, b.result.score); assert.deepStrictEqual(a.simulatedEvents, b.simulatedEvents); });
t('v2 records carry version metadata and replay exactly, including the target measurement', () => { for (const m of MD.MISSIONS) { const rec = mk(m, `${Sc.PREFIX[m]}-Q8WNE`, STD, decsOf(m)[77], null, MD.TARGETS[m][2].id);
  for (const f of ['gameVersion', 'recordVersion', 'engineVersion', 'scenarioVersion', 'launchProfile', 'requirement', 'summary', 'attempt']) assert.ok(rec[f] !== undefined, f); assert.strictEqual(rec.requirement.definitionVersion, MD.DEF_VERSION);
  const r = MD.replay(JSON.parse(JSON.stringify(rec))); assert.ok(r.matches); assert.strictEqual(J(r.summary), J(rec.summary)); } });
t('every new player decision has a real engine effect: each target is evaluated; each part swap can change the result', () => { for (const m of MD.MISSIONS) { const dec = decsOf(m)[m === 'storm' ? 85 : 0], base = MD.runFull(m, STD, dec, null).s;
  assert.ok(K.some(k => scoreSig(MD.runFull(m, Object.assign({}, STD, { [k]: 'adv' }), dec, null).s) !== scoreSig(base)));
  assert.strictEqual(new Set(MD.TARGETS[m].map(x => J(MD.evaluateTarget(m, x.id, MD.runFull(m, STD, dec, null).M).evidence))).size, MD.TARGETS[m].length, 'each target measures something different'); } });


console.log('Wildfire architecture (P1)');
const ARCH2 = 'dawn-dusk-sso', FDEC = [['wide', 'high'], ['alerts', 'full'], ['normal', 'image'], ['wide', 'fast']];
t('the default profile reproduces every v6.3 baseline run exactly (26,880 runs, same hash), with or without naming it', () => { const base = require('./fixtures/fire_baseline_v63.json'), crypto = require('crypto');
  for (const arch of [undefined, 'pm-sso']) { const h = crypto.createHash('sha256'); let c = 0;
    for (const sd of ['PRACTICE', '7K3QX', 'AB2CD', 'M4RSH', 'ZZ999']) { const scn = Sc.generate('fire', sd); for (const d of designs()) { if (!WF.totals(d).valid) continue; for (const dd of decsOf('fire')) { const r = arch ? WF.runFull(d, dd, scn, null, arch) : WF.runFull(d, dd, scn); c++;
      h.update(JSON.stringify([r.s.total, r.s.outcome, r.s.sci.toFixed(9), r.s.del.toFixed(9), r.s.eff.toFixed(9), r.s.rel.toFixed(9), r.M.battery.toFixed(9), r.M.items.map(x => [x.id, x.kind, x.t, x.status, x.deliveredAt])])); } } }
    assert.strictEqual(c, base.runs); assert.strictEqual(h.digest('hex'), base.sha256); }
  assert.strictEqual(WF.ARCH['pm-sso'].passes, WF.CONFIG.passes); assert.strictEqual(WF.ARCH['pm-sso'].contacts, WF.CONFIG.contacts); assert.strictEqual(WF.ARCH['pm-sso'].eclipse, WF.CONFIG.eclipse); });
t('option 2 changes real engine inputs: pass times, contact times and eclipse all show up in the mission ledger', () => { const a = WF.runFull(STD, FDEC, null), b = WF.runFull(STD, FDEC, null, null, ARCH2), img = M => M.items.filter(i => i.kind === 'image').map(i => i.t);
  assert.deepStrictEqual(img(a.M), [2, 8, 14, 20]); assert.deepStrictEqual(img(b.M), [3.5, 9.5, 15.5, 21.5]); assert.strictEqual(b.M.arch.id, ARCH2); assert.strictEqual(a.M.arch.id, 'pm-sso');
  const firstDel = M => Math.min(...M.items.filter(i => i.status === 'delivered').map(i => i.deliveredAt)); assert.ok(firstDel(a.M) >= 3 && firstDel(a.M) < 4); assert.ok(firstDel(b.M) >= 4.5 && firstDel(b.M) < 5.5);
  assert.ok(b.M.minBatt > a.M.minBatt + 5, `no eclipse -> higher lowest battery (${a.M.minBatt.toFixed(1)}% vs ${b.M.minBatt.toFixed(1)}%)`); assert.notStrictEqual(J(a.M.items.map(i => i.deliveredAt)), J(b.M.items.map(i => i.deliveredAt))); });
t('no time-of-day detection advantage: with the same footprint and mode both orbits detect the same events at the same strength', () => { for (const [d, dd] of sample('fire', 7)) { if (dd[2][1] === 'skip') continue; const a = WF.runFull(d, dd, null), b = WF.runFull(d, dd, null, null, ARCH2);
  const st = M => M.items.filter(i => i.kind === 'image').map(i => [i.pass, i.strength.toFixed(6), i.regions.join('')]); const sameImgs = J(st(a.M)) === J(st(b.M)); if (sameImgs) assert.deepStrictEqual([...a.M.detected].sort(), [...b.M.detected].sort()); }
  const f = WF.archProfile(ARCH2); assert.ok(!('detect' in f) && !('sens' in f)); });
t('the choice is a real trade-off: across designs and decisions each orbit wins some flights and loses others', () => { let better = 0, worse = 0, up = 0, down = 0; const rk = o => o === 'Mission Success' ? 2 : o === 'Partial Success' ? 1 : 0;
  for (const sd of ['PRACTICE', '7K3QX']) { const scn = Sc.generate('fire', sd); for (const [d, dd] of sample('fire', 3)) { const a = WF.runFull(d, dd, scn).s, b = WF.runFull(d, dd, scn, null, ARCH2).s; if (b.total > a.total) better++; if (b.total < a.total) worse++; if (rk(b.outcome) > rk(a.outcome)) up++; if (rk(b.outcome) < rk(a.outcome)) down++; } }
  assert.ok(better > 100 && worse > 100 && up > 5 && down > 5, `dawn-dusk better ${better}, worse ${worse}, outcome up ${up}, down ${down}`); });
t('conservation still holds in option 2: energy, storage and transmission limits', () => { const A = WF.archProfile(ARCH2), hours = MD.contactWindows(A).reduce((x, c) => x + c[1] - c[0], 0); assert.strictEqual(hours, 4.5);
  for (const sd of ['PRACTICE', 'ZZ999']) { const scn = Sc.generate('fire', sd); for (const [d, dd] of sample('fire', 5)) { const M = WF.newMission(d, scn, ARCH2); M.traceOn = true; for (let ci = 0; ci < 4; ci++) WF.runChallenge(M, ci, dd[ci]);
    for (const f of M.trace) { assert.ok(f.batteryPct >= -1e-6 && f.batteryPct <= 100 + 1e-6); assert.ok(f.storagePct <= 100 + 1e-6); }
    const sent = M.items.reduce((x, i) => x + (i.sizeGB - i.remainingGB), 0); assert.ok(sent <= M.P.comms.rateGBh * hours + 1e-6, 'GB sent <= rate x contact time');
    for (const i of M.items) { assert.ok(i.remainingGB >= -1e-9 && i.remainingGB <= i.sizeGB + 1e-9); if (i.status === 'delivered') { assert.ok(A.contacts.some(c => i.deliveredAt >= c[0] - 1e-9 && i.deliveredAt <= c[1] + 1e-9), 'delivered inside a contact'); assert.ok(i.deliveredAt >= i.t); } }
    assert.ok(M.items.filter(i => i.kind === 'image').every(i => A.passes.some(p => Math.abs(i.t - p.h) < 0.2)), 'images only during passes');
    assert.ok(M.battery <= M.P.power.battKWh + 1e-9 && M.energy.imaging >= 0 && M.energy.comms >= 0); } } });
t('Mission Code events are the same in both orbits: identical parameters; only the displayed clock time follows the schedule', () => { for (const sd of ['7K3QX', 'AB2CD', 'M4RSH', 'ZZ999']) { const scn = Sc.generate('fire', sd), before = J(scn), v = WF.scenarioView(scn, ARCH2);
  assert.strictEqual(J(scn), before, 'view never mutates the scenario'); assert.strictEqual(J(v.params), J(scn.params)); assert.strictEqual(v.code, scn.code); assert.strictEqual(v.id, scn.id); assert.strictEqual(v.events.length, scn.events.length); assert.strictEqual(WF.scenarioView(scn, 'pm-sso'), scn);
  const a = WF.runFull(STD, FDEC, scn), b = WF.runFull(STD, FDEC, v, null, ARCH2), c = WF.runFull(STD, FDEC, scn, null, ARCH2); assert.strictEqual(J(a.M.scn), J(b.M.scn)); assert.strictEqual(scoreSig(b.s), scoreSig(c.s)); } });
t('architecture is recorded with id and version, replays deterministically, and old records default to option 1', () => { const scn = Sc.generate('fire', 'Q8WNE'), r = WF.runFull(STD, FDEC, scn, null, ARCH2), rec = MD.makeRecord({ mission: 'fire', M: r.M, score: r.s, scn, targetId: 'F3', archId: ARCH2 });
  assert.deepStrictEqual(rec.architecture, { id: ARCH2, version: '1.0' }); const x = MD.replay(JSON.parse(JSON.stringify(rec))), y = MD.replay(JSON.parse(JSON.stringify(rec))); assert.ok(x.matches && y.matches); assert.strictEqual(J(x.summary), J(rec.summary)); assert.strictEqual(scoreSig(x.s), scoreSig(y.s));
  assert.strictEqual(MD.replay(FIX.find(f => f.mission === 'fire')).M.arch.id, 'pm-sso'); assert.strictEqual(MD.makeRecord({ mission: 'storm', M: MD.runFull('storm', STD, decsOf('storm')[0], null).M, scn: Sc.generate('storm', 'PRACTICE') }).architecture, null);
  assert.throws(() => WF.archProfile('nope')); });
t('redesign with an orbit change: decisions carry over (one pass per challenge in both), launch check is re-run for the profile', () => { const rec = FIX.find(f => f.missionCode === 'FIRE-7K3QX'), c = MD.carry('fire', rec, rec.design, ARCH2); assert.ok(c.architectureChanged && !c.hardwareChanged); assert.deepStrictEqual(c.resets, []); assert.deepStrictEqual(c.manipulations, rec.manipulations);
  const p = Sc.parseCode(rec.missionCode), b = MD.runFull('fire', rec.design, c.decisions, Sc.generate('fire', p.seed), c.manipulations, ARCH2); assert.notStrictEqual(b.s.total + b.s.outcome + b.M.minBatt, rec.result.score + rec.result.outcome);
  for (const d of designs()) { const a1 = MD.designCheck('fire', d, 'pm-sso'), a2 = MD.designCheck('fire', d, ARCH2); assert.strictEqual(a1.launch.ok, a2.launch.ok); assert.strictEqual(a2.launch.maxKg, WF.CONFIG.limits.kg); assert.strictEqual(a2.canLaunch, WF.totals(d).valid); }
  assert.strictEqual(MD.designCheck('fire', STD, ARCH2).rows.find(r => r.key === 'eclipse').val, 'none'); assert.ok(/4 contact windows, 4.5 h/.test(MD.designCheck('fire', STD, ARCH2).rows.find(r => r.key === 'contacts').val)); });
t('only Wildfire has an architecture choice; option descriptions quote the engine schedule and make no detection claim', () => { assert.strictEqual(MD.archOptions('storm').length, 0); assert.strictEqual(MD.archOptions('flood').length, 0); const o = MD.archOptions('fire'); assert.strictEqual(o.length, 2); assert.ok(o[0].isDefault && !o[1].isDefault);
  for (const a of o) { WF.ARCH[a.id].passes.forEach(p => assert.ok(a.facts[0].includes(MD.hm(p.h)))); assert.ok(/class D/.test(a.label) && /not computed orbits/.test(a.label) && /exactly the same/.test(a.detection)); }
  assert.ok(/No eclipse/.test(o[1].facts[2]) && /30 of every 100/.test(o[0].facts[2])); assert.ok(MD.WHY_ORBIT.storm.length > 40 && MD.WHY_ORBIT.flood.length > 40); });

console.log(`\n${n} design tests passed`);
