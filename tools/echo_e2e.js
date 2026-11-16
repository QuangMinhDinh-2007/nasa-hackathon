#!/usr/bin/env node
/* Project ECHO browser tests. Plays the real game in headless Chromium (Brave or Chrome) by clicking real buttons.
 *
 *   node tools/echo_e2e.js parity <gameDir> <out.json>   record 27 fixed cases (3 missions x 3 Mission Codes x 3 design+decision sets)
 *   node tools/echo_e2e.js compare <a.json> <b.json>     deep-compare two parity recordings
 *   node tools/echo_e2e.js e2e <gameDir> [parity.json]   Mission Room flow checks for all three missions
 *
 * "parity" works on any build (with or without the echo/ layer), so the same cases can be recorded on the commit
 * before Project ECHO (git tag pre-echo) and on the current tree, then compared.
 * Set BROWSER=/path/to/chrome to use another Chromium build.
 */
'use strict';
const fs = require('fs'), path = require('path'), { execFileSync } = require('child_process');
const BROWSER = process.env.BROWSER || ['/Applications/Brave Browser.app/Contents/MacOS/Brave Browser', '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome'].find(p => fs.existsSync(p));
const MS = ['storm', 'fire', 'flood'];

function runPage(gameDir, script, budget) {
  const src = fs.readFileSync(path.join(gameDir, 'index.html'), 'utf8'), i = src.lastIndexOf('</body>'), f = path.join(gameDir, 'index-echo-test.html');
  fs.writeFileSync(f, src.slice(0, i) + '<script>' + script + '</script>' + src.slice(i));
  try {
    const out = execFileSync(BROWSER, ['--headless', '--disable-gpu', '--allow-file-access-from-files', '--force-prefers-reduced-motion', '--window-size=1440,900', '--virtual-time-budget=' + budget, '--dump-dom', 'file://' + path.resolve(f)], { maxBuffer: 1 << 28, stdio: ['ignore', 'pipe', 'ignore'] }).toString();
    const m = out.match(/<title>([\s\S]*?)<\/title>/); const t = (m ? m[1] : '').replace(/&quot;/g, '"').replace(/&amp;/g, '&').replace(/&lt;/g, '<').replace(/&gt;/g, '>');
    if (!t.startsWith('RES:')) throw new Error('page did not finish: ' + t.slice(0, 600));
    return JSON.parse(t.slice(4));
  } finally { fs.unlinkSync(f); }
}

/* ---- code shared by both in-page drivers ---- */
const COMMON = `
const q = s => document.querySelector(s), qa = s => [...document.querySelectorAll(s)], sleep = ms => new Promise(r => setTimeout(r, ms));
const fail = e => { document.title = 'ERR:' + (e && e.stack || e) + ' | screen=' + S.screen + ' | last checks: ' + (window.__c || []).slice(-3).map(c => c[0] + '=' + c[1]).join('; '); }; window.addEventListener('error', e => fail(e.error || e.message)); window.addEventListener('unhandledrejection', e => fail(e.reason));
const hash = s => { let h = 5381; for (let i = 0; i < s.length; i++) h = ((h << 5) + h + s.charCodeAt(i)) | 0; return h; };
const until = async (f, ms, what) => { for (let t = 0; t < (ms || 60000); t += 50) { if (f()) return; await sleep(50); } throw new Error('timeout: ' + what + ' screen=' + S.screen); };
const ACC = '[data-a="accept"],[data-a="faccept"],[data-a="laccept"]', RUN = '[data-a="run"],[data-a="frun"],[data-a="lrun"]', NEXT = '[data-a="next"],[data-a="fnext"],[data-a="lnext"]';
let simCalls = 0; { const w = f => function () { simCalls++; return f.apply(this, arguments); }; simulate = w(simulate); fsim = w(fsim); lsim = w(lsim); }
function record(m) { const st = MX[m].st(), E = MX[m].eng, sc = E.score(st.M), d = E.derive(st.M);
  return { total: sc.total, outcome: sc.outcome, gates: sc.gates, parts: [sc.sci, sc.del, sc.eff, sc.rel], log: st.log.map(L => [!!L.met, L.badge, L.choices]),
    choice: st.choice, state: hash(JSON.stringify(d)), events: hash(JSON.stringify(MX[m].events(st.M))), trace: st.M.trace.length }; }
`;

/* ---- parity: the same fixed cases, played through the UI ---- */
const PARITY = mission => COMMON + `
window.addEventListener('load', () => setTimeout(async () => { try {
  const out = {}, m = ${JSON.stringify(mission)}, echo = !!window.ECHO; if (echo) ECHO.test.fast();
  for (const code of ['PRACTICE', 'ECHO-TEST-1', 'ECHO-TEST-2']) for (const set of [0, 1, 2]) {
    S.mission = m; S.scn[m] = Scenario.generate(m, code); S.target[m] = MissionDesign.TARGETS[m][0].id; if (S.redo) delete S.redo[m];
    const d = MX[m].design(); Object.keys(d).forEach((k, i) => { d[k] = set === 0 ? 'std' : set === 1 ? 'adv' : i % 2 ? 'adv' : 'std'; });
    if (echo) { const E = ECHO.state; E.briefed[m] = E.designed[m] = true; E.run[m]++; E.inCh[m] = null; }
    window.endLaunch(); await sleep(500);
    const n0 = simCalls;
    for (let ci = 0; ci < 4; ci++) {
      if (S.screen === 'room') { q('.rhot.is-go').click(); await sleep(100); }
      await until(() => q(ACC), 5000, 'alert ' + ci); q(ACC).click(); await sleep(50);
      const st = MX[m].st(); st.choice[ci] = chx(m, ci).groups.map((g, gi) => g.opts[set === 0 ? 0 : set === 1 ? Math.min(1, g.opts.length - 1) : (ci + gi) % Math.min(2, g.opts.length)][0]); render();
      q(RUN).click(); await until(() => MX[m].st().phase === 'result' && q(NEXT), 120000, 'result ' + ci);
      q(NEXT).click(); await sleep(450);
    }
    if (S.screen === 'room') { q('.rhot.is-go').click(); await sleep(100); }
    await until(() => q('.cr'), 5000, 'report');
    const r = record(m); r.simCalls = simCalls - n0; out[m + '|' + code + '|' + set] = r;
  }
  document.title = 'RES:' + JSON.stringify(out);
} catch (e) { fail(e); } }, 500));`;

/* ---- e2e: the whole Project ECHO flow, stories watched, every rule checked ---- */
const E2E = mission => COMMON + `
window.addEventListener('load', () => setTimeout(async () => { try {
  const m = ${JSON.stringify(mission)}, T = EchoStory, E = ECHO.state, checks = window.__c = [], ok = (name, cond, info) => checks.push([name, !!cond, cond ? '' : String(info === undefined ? '' : info)]);
  const START = { storm: 'startMission', fire: 'fstart', flood: 'lstart' }[m], BUILD = { storm: 'build', fire: 'fbuild', flood: 'lbuild' }[m], OPS = { storm: 'ops', fire: 'fops', flood: 'lops' }[m], REPORT = { storm: 'report', fire: 'freport', flood: 'lreport' }[m];
  let lastComic = '', panels = 0, tours = 0;
  const story = async () => { for (let i = 0; i < 80; i++) { const c = q('#echoComic:not([hidden]) [data-e="comicNext"]'), t = q('#echoTalk:not([hidden]) [data-e="talkNext"]'), tr = q('#echoTour:not([hidden]) [data-e="tourNext"]');
    if (tr) { tours++; tr.click(); } else if (c) { const tt = q('.ec-title'); lastComic = tt ? tt.textContent : ''; panels++; c.click(); } else if (t) t.click(); else return; await sleep(60); } throw new Error('story never ended'); };
  // engine-facing state only: the simulation, the clock, the log, the committed decisions, the design, the goal and the Mission Code
  const snap = () => { const st = MX[m].st(); return JSON.stringify([st ? [MX[m].eng.derive(st.M), st.M.trace.length, MX[m].events(st.M).length, st.ci, st.log, st.choice] : null, MX[m].design(), S.target[m], S.scn[m].code, simCalls]); };
  const hot = k => q('.rhot[data-hot="' + k + '"]'), active = () => ECHO.activeHot(m), glow = () => qa('.rhot.is-go').map(x => x.dataset.hot).join(',');
  const launch = async () => { hot('launch').click(); await sleep(100); ok('launch check opens with the Flight Director', q('#layer .er-dir') && q('#layer [data-a="goLaunch"]'));
    ok('launch is allowed for a valid design', !q('#layer [data-a="goLaunch"]').disabled); q('#layer [data-a="goLaunch"]').click();
    await until(() => q('[data-a="skip"]') || S.screen === 'room', 20000, 'launch animation'); const sk = q('[data-a="skip"]'); if (sk) sk.click(); await sleep(600); };
  const fly = async (tag) => { const n0 = simCalls; let carry = null;
    for (let ci = 0; ci < 4; ci++) { await story(); const want = T.hot[m][ci];
      ok(tag + ' c' + (ci + 1) + ': only the mapped console glows', S.screen === 'room' && glow() === want, glow() + ' vs ' + want);
      const d0 = JSON.stringify(MX[m].eng.derive(MX[m].st().M)); if (carry) ok(tag + ' c' + (ci + 1) + ': battery, storage and data carried over', carry === d0);
      const s0 = snap(), other = ['holo', 'bench', 'launch', 'obs', 'data', 'power', 'comms', 'board'].filter(k => k !== want);
      for (const k of other) { hot(k).click(); await sleep(30); await story(); }
      ok(tag + ' c' + (ci + 1) + ': inactive objects change nothing', snap() === s0 && S.screen === 'room');
      hot(want).click(); await sleep(100); ok(tag + ' c' + (ci + 1) + ': console opens the task card', S.screen === OPS && q(ACC));
      ok(tag + ' c' + (ci + 1) + ': opening does not advance time', snap() === s0);
      q('[data-a="alertBack"],[data-a="falertBack"],[data-a="lalertBack"]').click(); await sleep(100); await story();
      ok(tag + ' c' + (ci + 1) + ': backing out returns to the room unchanged', S.screen === 'room' && snap() === s0);
      hot(want).click(); await sleep(100); q(ACC).click(); await sleep(60); ok(tag + ' c' + (ci + 1) + ': notebook reachable on the gameplay screen', q('#app .e-navnote'));
      q('#app .e-navnote').click(); await sleep(30); ok(tag + ' c' + (ci + 1) + ': notebook opens and changes nothing', !q('#echoNote').hidden && snap() === s0); q('[data-e="noteClose"]').click();
      if (ci === 1) { const s1 = snap(); q('[data-e="moToggle"]').click(); await sleep(30); ok(tag + ' overview collapses to essentials', q('.mo.mo-closed .mo-mini') && qa('.mo-mini > div').length === 4 && snap() === s1); }
      q(RUN).click(); await until(() => MX[m].st().phase === 'result' && q(NEXT), 120000, 'result');
      if (ci === 1) { ok(tag + ' overview stays collapsed through playback', !!q('.mo.mo-closed')); q('[data-e="moToggle"]').click(); await sleep(30); ok(tag + ' overview expands again', q('.mo:not(.mo-closed) .mo-sec')); }
      ok(tag + ' c' + (ci + 1) + ': engine ran exactly once', simCalls - n0 === ci + 1, simCalls - n0);
      ok(tag + ' c' + (ci + 1) + ': result is shown before the room', S.screen === OPS && MX[m].st().phase === 'result' && q(NEXT));
      carry = JSON.stringify(MX[m].eng.derive(MX[m].st().M)); const L = MX[m].st().log[ci], dv = MX[m].eng.derive(MX[m].st().M);
      q(NEXT).click(); await sleep(450);
      ok(tag + ' c' + (ci + 1) + ': returns to the Mission Room', S.screen === 'room');
      ok(tag + ' c' + (ci + 1) + ': room battery gauge is the engine value', (hot('power').querySelector('.rhot-tag') || {}).textContent === 'Battery ' + Math.round(dv.batteryPct) + '%', (hot('power').querySelector('.rhot-tag') || {}).textContent);
      ok(tag + ' c' + (ci + 1) + ': room storage gauge is the engine value', (hot('data').querySelector('.rhot-tag') || {}).textContent === 'Storage ' + Math.round(dv.storagePct) + '%');
      const chip = q('#echoTalk .et-chip'); ok(tag + ' c' + (ci + 1) + ': ECHO reacts with the game verdict', chip && chip.textContent === L.badge && chip.classList.contains(L.met ? 'ok' : 'no'), chip && chip.textContent);
      const bd = hot(want).querySelector('.rhot-badge'); if (bd) ok(tag + ' c' + (ci + 1) + ': console badge matches the verdict', bd.textContent === (L.met ? '✓' : '!')); }
    await story(); const sc = MX[m].eng.score(MX[m].st().M);
    ok(tag + ': ending matches the engine outcome', lastComic === sc.outcome, lastComic + ' vs ' + sc.outcome);
    ok(tag + ': four engine runs in the flight', simCalls - n0 === 4, simCalls - n0); };
  const openReport = async (tag) => { ok(tag + ': Report Board glows', glow() === 'board', glow()); hot('board').click(); await sleep(100);
    ok(tag + ': compact report opens with ECHO line', S.screen === REPORT && q('.cr') && q('.e-rline'));
    ok(tag + ': report offers Rewind, Fly Again, All Missions', q('.acts-row [data-a="improve"]') && q('.acts-row [data-a$="retry"]') && qa('.acts-row button').length === 3);
    ok(tag + ': report score is the engine score', q('.cr-sc').textContent === MX[m].eng.score(MX[m].st().M).total + '/100');
    ok(tag + ': report has bonus goal and collapsed full report', q('.cr-bonus') && q('details.cr-full:not([open])') && q('details.cr-full #verifyPanel, details.cr-full .cr-full-in').children.length > 0);
    const sv = ECHO.profiles.cur().results[0], sc = MX[m].eng.score(MX[m].st().M);
    ok(tag + ': saved result matches the engine', sv && sv.m === m && sv.score === sc.total && sv.outcome === sc.outcome && sv.code === S.scn[m].code, JSON.stringify(sv));
    savedN++; ok(tag + ': one saved entry per flight', ECHO.profiles.cur().results.length === savedN, ECHO.profiles.cur().results.length); return record(m); };
  let savedN = 0;

  // title, prologue, episode select, episode brief
  ok('starts on the title screen', S.screen === 'title' && q('[data-e="begin"]')); q('[data-e="begin"]').click(); await sleep(60);
  ok('first start asks for a player name', q('#echoAcct:not([hidden]) #acctName')); q('#acctName').value = 'Test ' + m; q('[data-e="acctNew"]').click(); await sleep(60);
  ok('player created and adventure continues', ECHO.profiles.cur() && ECHO.profiles.cur().name === 'Test ' + m && q('#echoAcct').hidden);
  panels = 0; await story(); ok('prologue has four panels', panels === 4, panels); ok('episode select shows three missions', S.screen === 'missions' && qa('.e-ep').length === 3);
  q('[data-a="' + START + '"]').click(); await sleep(60); S.scn[m] = Scenario.generate(m, 'PRACTICE'); const code = S.scn[m].code;
  panels = 0; await story(); ok('episode brief has three panels', panels === 3, panels);
  ok('five-step tour shown once', tours === 5, tours);
  ok('Mission Room: Earth hologram glows first', S.screen === 'room' && glow() === 'holo', glow());
  hot('power').click(); await sleep(30); await story(); ok('wrong object does not navigate', S.screen === 'room' && active() === 'holo');
  hot('holo').click(); await sleep(60); ok('hologram opens the existing goal screen', S.screen === 'brief' && qa('[data-a="pickTarget"]').length === 3); if (m === 'fire') ok('wildfire keeps its orbit choice', qa('[data-a="pickArch"]').length >= 2); q('[data-a="pickTarget"]').click(); await sleep(30); q('[data-a="briefGo"]').click(); await sleep(60); await story();
  ok('Workbench glows after the goal', S.screen === 'room' && glow() === 'bench', glow());
  hot('bench').click(); await sleep(60); ok('workbench opens the existing builder', S.screen === BUILD && q('[data-a="mrr"]')); q('[data-a="mrr"]').click(); await sleep(60); await story();
  ok('Launch Console glows after the build', S.screen === 'room' && glow() === 'launch', glow());
  await launch(); ok('after launch: back in the room, clock at zero', S.screen === 'room' && simCalls === 0 && MX[m].st().ci === 0);

  await fly('flight 1'); const r1 = await openReport('flight 1');

  // Rewind & Redesign -> Fly My Earlier Decisions (same satellite): must reproduce the flight exactly
  q('.acts-row [data-a="improve"]').click(); await sleep(100); await story();
  ok('rewind: back at the Workbench with the same Mission Code', S.screen === BUILD && S.redo[m] && S.redo[m].code === code && S.scn[m].code === code);
  q('[data-a="mrr"]').click(); await sleep(60); await story(); await launch(); await until(() => q('[data-a="redoSame"]'), 5000, 'rewind choice');
  ok('rewind: both choices offered', q('[data-a="redoSame"]') && q('[data-a="redoNew"]') && S.screen === 'room');
  q('[data-a="redoSame"]').click(); await sleep(200); await story(); const r2 = await openReport('rewind same decisions');
  ok('rewind: same satellite + earlier decisions = identical result', JSON.stringify([r1.total, r1.outcome, r1.gates, r1.parts, r1.state, r1.events]) === JSON.stringify([r2.total, r2.outcome, r2.gates, r2.parts, r2.state, r2.events]), r1.total + ' vs ' + r2.total);

  if (m === 'storm') {   // Fly Again, Same Satellite
    const d0 = JSON.stringify(MX[m].design()); q('.acts-row [data-a$="retry"]').click(); await sleep(500); await story();
    const st = MX[m].st(), dv = MX[m].eng.derive(st.M);
    ok('fly again: fresh flight state', S.screen === 'room' && st.ci === 0 && st.phase === 'alert' && st.log.filter(Boolean).length === 0 && st.M.trace.length === 0, [st.ci, st.phase, st.log.length, st.M.trace.length]);
    ok('fly again: same satellite and Mission Code', JSON.stringify(MX[m].design()) === d0 && S.scn[m].code === code);
    ok('fly again: Challenge 1 console glows', glow() === T.hot[m][0], glow());
  } else {               // Rewind & Redesign -> Make New Decisions
    q('.acts-row [data-a="improve"]').click(); await sleep(100); await story(); q('[data-a="mrr"]').click(); await sleep(60); await story(); await launch(); await until(() => q('[data-a="redoNew"]'), 5000, 'rewind choice 2');
    q('[data-a="redoNew"]').click(); await sleep(200); await story(); const st = MX[m].st();
    ok('new decisions: fresh flight, Challenge 1 console glows', S.screen === 'room' && st.ci === 0 && st.log.filter(Boolean).length === 0 && glow() === T.hot[m][0] && S.scn[m].code === code, glow());
  }
  q('[data-e="note"]').click(); await sleep(30); for (const t of ['mission', 'numbers', 'words', 'story', 'nasa']) { q('[data-e="noteTab"][data-tab="' + t + '"]').click(); await sleep(20); }
  ok('notebook: all five tabs render', !q('#echoNote').hidden && q('.en-body').textContent.length > 40);
  document.title = 'RES:' + JSON.stringify({ checks, r1 });
} catch (e) { fail(e); } }, 500));`;

const [mode, a, b] = process.argv.slice(2);
if (mode === 'parity') { const out = {}; MS.forEach(m => Object.assign(out, runPage(a, PARITY(m), 3000000))); fs.mkdirSync(path.dirname(path.resolve(b)), { recursive: true }); fs.writeFileSync(b, JSON.stringify(out, null, 1)); console.log(`${Object.keys(out).length} parity cases recorded -> ${b}`); }
else if (mode === 'compare') { const A = JSON.parse(fs.readFileSync(a)), B = JSON.parse(fs.readFileSync(b)); let bad = 0;
  for (const k of new Set([...Object.keys(A), ...Object.keys(B)])) if (JSON.stringify(A[k]) !== JSON.stringify(B[k])) { bad++; console.log('DIFF', k, '\n  a:', JSON.stringify(A[k]), '\n  b:', JSON.stringify(B[k])); }
  console.log(bad ? `${bad} parity cases differ` : `${Object.keys(A).length} parity cases identical`); process.exit(bad ? 1 : 0); }
else if (mode === 'e2e') { let bad = 0, n = 0; const par = b ? JSON.parse(fs.readFileSync(b)) : null;
  for (const m of MS) { const r = runPage(a, E2E(m), 3000000); r.checks.forEach(c => { n++; if (!c[1]) { bad++; console.log(`FAIL [${m}] ${c[0]} ${c[2]}`); } });
    if (par) { n++; const p = par[m + '|PRACTICE|0']; if (JSON.stringify(p) !== JSON.stringify(Object.assign({}, r.r1, { simCalls: 4 }))) { bad++; console.log(`FAIL [${m}] watching every story gives the same record as skipping it\n  watched: ${JSON.stringify(r.r1)}\n  skipped: ${JSON.stringify(p)}`); } } }
  console.log(bad ? `${bad} of ${n} ECHO checks failed` : `${n} ECHO checks passed`); process.exit(bad ? 1 : 0); }
else { console.log('usage: echo_e2e.js parity <gameDir> <out.json> | compare <a.json> <b.json> | e2e <gameDir> [parity.json]'); process.exit(2); }
