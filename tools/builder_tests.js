// v6.3 builder checks (presentation only). Run: node tools/builder_tests.js
const fs = require('fs'), path = require('path'), assert = require('assert');
const src = fs.readFileSync(path.join(__dirname, '../game/builder.js'), 'utf8');
const CFG = require('../game/engine.js').makeConfig('v34'), WC = require('../game/wildfire-engine.js').CONFIG, LC = require('../game/flood-engine.js').makeConfig('v41');
const S = { design: {}, fdesign: {}, ldesign: {} };
const stub = { head: { insertAdjacentHTML() {} }, addEventListener() {}, querySelectorAll: () => [] };
const B = new Function('document', 'CFG', 'WC', 'LC', 'S', 'render', 'softView', 'tipDecorate', 'module', src + ';return module.exports;')(stub, CFG, WC, LC, S, () => {}, () => {}, () => {}, { exports: {} });
const K = ['instrument', 'observation', 'power', 'comms', 'storage'], V = ['std', 'adv'];
const PARTS = { storm: CFG.parts, fire: WC.parts, flood: LC.parts }, DES = { storm: 'design', fire: 'fdesign', flood: 'ldesign' };
let n = 0; const t = (name, f) => { f(); n++; console.log('  ✓ ' + name); };
console.log('Builder v6.3 checks');
t('every card shows weight and cost read from the mission table', () => { for (const m in PARTS) for (const k of K) for (const v of V) { const o = PARTS[m][k][v], s = B.bSpecs(m, k, o);
  assert.strictEqual(s.find(x => x.lab === 'Weight').val, `${o.kg} kg`); assert.ok(s.find(x => x.lab === 'Cost').val.includes(String(m === 'fire' ? o.credits : o.costM))); } });
t('every spec value contains the number from the config (no invented numbers)', () => { const num = x => String(Math.round(x * 100) / 100);
  const chk = { storm: { instrument: ['basePts', 'sizeGB', 'imgKW'], observation: ['maxPerHour'], power: ['solarKW', 'battKWh'], comms: ['rateGBh', 'commKW'], storage: ['capGB'] },
    fire: { instrument: ['sizeGB', 'imgKW', 'basePts'], observation: ['perPass'], power: ['solarKW', 'battKWh'], comms: ['rateGBh', 'commKW'], storage: ['capGB'] },
    flood: { instrument: ['basePts', 'sizeGB', 'imgKW'], observation: ['perPass'], power: ['solarKW', 'battKWh'], comms: ['txKW'], storage: ['capGB'] } };
  for (const m in chk) for (const k in chk[m]) for (const v of V) { const o = PARTS[m][k][v], vals = B.bSpecs(m, k, o).map(s => s.val).join('|'); chk[m][k].forEach(f => assert.ok(vals.includes(num(o[f])), `${m} ${k} ${v} ${f}=${o[f]} in ${vals}`)); }
  assert.ok(B.bSpecs('fire', 'instrument', WC.parts.instrument.std).some(s => s.val === '0.80'));
  assert.ok(B.bSpecs('flood', 'comms', LC.parts.comms.std).some(s => s.val === '0.6 GB')); assert.ok(B.bSpecs('storm', 'comms', CFG.parts.comms.adv).some(s => s.val === '0.8 GB/h')); });
t('arrows mirror each other and follow the real values; 2–3 per card', () => { for (const m in PARTS) for (const k of K) { const a = B.bTrades(m, k, 'std'), b = B.bTrades(m, k, 'adv');
  assert.ok(a.length >= 2 && a.length <= 3 && b.length >= 2 && b.length <= 3, `${m} ${k}`);
  a.filter(x => /[↑↓]/.test(x.ic)).forEach(x => { const y = b.find(z => z.lab === x.lab); if (y) { assert.notStrictEqual(x.ic, y.ic); assert.notStrictEqual(x.good, y.good); } }); } });
t('no arrow is shown when both options have the same value', () => { const C2 = JSON.parse(JSON.stringify(WC)); C2.parts.storage.adv.kg = C2.parts.storage.std.kg;
  const B2 = new Function('document', 'CFG', 'WC', 'LC', 'S', 'render', 'softView', 'tipDecorate', 'module', src + ';return module.exports;')(stub, CFG, C2, LC, S, () => {}, () => {}, () => {}, { exports: {} });
  assert.ok(!B2.bTrades('fire', 'storage', 'std').some(x => x.lab === 'Weight')); });
t('Optical vs Radar uses capability labels, not up/down, for the categorical difference', () => { const o = B.bTrades('flood', 'instrument', 'std').map(x => x.lab), r = B.bTrades('flood', 'instrument', 'adv').map(x => x.lab);
  assert.ok(o.includes('Needs Sunlight') && o.includes('Blocked by Cloud') && r.includes('Day and Night') && r.includes('Sees through Cloud')); });
t('warnings fire exactly for the builds in the proposal', () => { const all = []; for (let i = 0; i < 32; i++) { const d = {}; K.forEach((k, j) => d[k] = (i >> j) & 1 ? 'adv' : 'std'); all.push(d); }
  const hit = m => all.filter(d => { S[DES[m]] = d; return !!B.bWarning(m); }).map(d => K.map(k => d[k] === 'adv' ? 'A' : 's').join(''));
  assert.deepStrictEqual(hit('storm').map(x => x.slice(0, 2) + x[4]).filter((v, i, a) => a.indexOf(v) === i), ['AAs']); // Advanced imager + Intensive + Small storage, any power or comms
  assert.deepStrictEqual(hit('fire').map(x => x.slice(0, 2) + x[3]).filter((v, i, a) => a.indexOf(v) === i).sort(), ['AAA', 'AAs', 'Ass', 'sAs'].sort());
  assert.deepStrictEqual(hit('flood').map(x => x.slice(0, 2) + x[4]).filter((v, i, a) => a.indexOf(v) === i).sort(), ['AAs', 'Ass', 'sAs'].sort()); });
t('selection uses the existing actions; no second design state', () => { assert.ok(/action: 'part', design: \(\) => S\.design/.test(src) && /action: 'fpart', design: \(\) => S\.fdesign/.test(src) && /action: 'lpart', design: \(\) => S\.ldesign/.test(src));
  assert.ok(!/S\.(design|fdesign|ldesign)\[[^\]]+\]\s*=/.test(src), 'builder never writes a design'); });
t('accessibility markup: aria-expanded, radiogroup/radio with aria-checked, hidden arrow text', () => { assert.ok(/aria-expanded="\$\{isOpen\}"/.test(src) && /role="radiogroup"/.test(src) && /role="radio" aria-checked=/.test(src) && /class="bsr"/.test(src)); });
t('no "helps"/"costs" words in trade-off labels', () => { for (const m in PARTS) for (const k of K) for (const v of V) B.bTrades(m, k, v).forEach(x => assert.ok(!/helps|costs|good|bad/i.test(x.lab))); });
console.log(`\n${n} checks passed`);
