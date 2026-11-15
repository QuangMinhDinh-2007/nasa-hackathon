// v7.0 end-to-end check in headless Chromium: briefing -> target -> builder -> Design Check -> launch -> 4 challenges ->
// verification -> Improve My Mission -> same-code retry -> comparison, for all three missions.
// Run: node tools/e2e_design_loop.js     (needs Playwright + Chromium; not part of the pure-Node suites)
const path = require('path'), { chromium } = require('playwright'), MD = require('../game/mission-design.js');
const START = { storm: 'startMission', fire: 'fstart', flood: 'lstart' }, PART = { storm: 'part', fire: 'fpart', flood: 'lpart' };
const PFX = { storm: '', fire: 'f', flood: 'l' }, STATE = { storm: 'ops', fire: 'f', flood: 'l' };
let n = 0; const ok = (c, msg) => { if (!c) { console.error('  ✗ ' + msg); process.exit(1); } n++; console.log('  ✓ ' + msg); };
(async () => {
  const browser = await chromium.launch(), page = await browser.newPage({ viewport: { width: 1400, height: 900 } });
  const errors = []; page.on('pageerror', e => errors.push(e.message)); page.on('console', m => { if (m.type() === 'error' && !/fonts|ERR_|Failed to load/.test(m.text())) errors.push(m.text()); });
  await page.goto('file://' + path.join(__dirname, '../game/index.html'));
  await page.evaluate(() => { S.voice = false; S.howSeen = true; });
  const click = async sel => { await page.waitForSelector(sel, { state: 'attached' }); await page.evaluate(q => document.querySelector(q).click(), sel); };  // delegated handlers; avoids fixed overlays
  const act = a => click(`[data-a="${a}"]`);
  const tryAct = a => page.evaluate(q => { const e = document.querySelector(q); if (e) e.click(); return !!e; }, `[data-a="${a}"]`);  // optional buttons that playback may remove by itself
  async function fly(m) { // play the four challenges by hand with the default options
    await act('skip'); await page.waitForTimeout(450);
    for (let ci = 0; ci < 4; ci++) {
      await page.waitForSelector(`[data-a="${PFX[m]}accept"]`); await act(PFX[m] + 'accept'); await act(PFX[m] + 'run');
      await page.waitForTimeout(150); await tryAct('jrSkip');
      for (let k = 0; k < 20 && !(await page.locator(`[data-a="${PFX[m]}next"]`).count()); k++) { if (!(await tryAct('callAns'))) await tryAct('jrSkip'); await page.waitForTimeout(150); }
      await act(PFX[m] + 'next'); await page.waitForTimeout(100); } }
  const rec = m => page.evaluate(k => JSON.parse(JSON.stringify(S[k].record)), STATE[m]);
  for (const m of ['storm', 'fire', 'flood']) {
    console.log(MD.NAME[m]);
    await page.evaluate(() => go('missions')); await act(START[m]);
    ok(await page.locator('.brief .bf-mini').count() === 2 && await page.locator('.brief .bf-chips .chip').count() === 4 && (await page.locator('.brief').innerText()).split(/\s+/).length < 250, 'short briefing before the builder: situation, who, what is hard, 4 requirements (under 250 words)');
    ok(await page.locator('[data-a="briefGo"]').isDisabled(), 'cannot continue without choosing a target');
    const tid = MD.TARGETS[m][0].id; await click(`.tg[data-t="${tid}"]`); await act('briefGo');
    ok(await page.evaluate(() => S.screen) === ({ storm: 'build', fire: 'fbuild', flood: 'lbuild' })[m], 'target chosen -> builder');
    ok((await page.locator('.md-strip').first().innerText()).includes(MD.TARGETS[m][0].title), 'builder shows the selected target');
    ok(await page.locator('.md-link dt').count() === 4, 'open part shows gives / uses / supports / makes harder');
    await page.evaluate(([m]) => { const sc = Scenario.generate(m, '7K3QX'); S.scn[m] = sc; S.scnMode[m] = 'class'; S.htp = {}; render(); }, [m]);
    await act('mrr'); ok((await page.locator('#layer').innerText()).includes('Launch compatibility'), 'Design Check lists launch compatibility');
    ok(!(await page.locator('[data-a="goLaunch"]').isDisabled()), 'feasible design can launch');
    await act('goLaunch'); await fly(m);
    ok(await page.locator('#verifyPanel .vr-row').count() === 5, 'report: 4 mandatory rows + 1 target row');
    const r1 = await rec(m); ok(r1.recordVersion === 2 && r1.requirement.target.id === tid && r1.missionCode.endsWith('7K3QX'), `record v2 stores target ${tid} and the code`);
    ok(MD.replay(r1).matches, `hand-played record replays in Node to ${r1.result.score} ${r1.result.outcome}`);
    const statusUi = (await page.locator('#verifyPanel .vr-tgt .chip').first().innerText()).trim(); ok(statusUi.toLowerCase() === r1.summary.target.status.toLowerCase(), `target status in UI (${statusUi}) = engine measurement`);
    // Improve My Mission, same satellite, earlier decisions -> identical result
    await act('improve'); ok((await page.locator('.md-redo').innerText()).includes(r1.missionCode), 'builder: original saved, Mission Code locked');
    await act('mrr'); await act('goLaunch'); await act('skip'); await page.waitForSelector('[data-a="redoSame"]'); await act('redoSame');
    const r2 = await rec(m); ok(JSON.stringify(r2.result) === JSON.stringify(r1.result) && JSON.stringify(r2.summary) === JSON.stringify(r1.summary), 'same code + same design + same decisions -> identical result');
    ok(await page.locator('#comparePanel').count() === 1, 'comparison panel shown');
    // change one part, re-fly earlier decisions
    await act('improve'); const k = m === 'flood' ? 'comms' : 'comms';
    await page.evaluate(([a, k]) => { document.querySelector(`.bhead[data-bopen="${k}"]`).click(); }, [PART[m], k]); await click(`.bcard[data-k="${k}"][data-v="adv"]`);
    ok(await page.locator('.md-note').count() === 1, 'changing a part shows a one-line target note');
    await act('mrr'); await act('goLaunch'); await act('skip'); await page.waitForSelector('[data-a="redoSame"]'); await act('redoSame');
    const r3 = await rec(m), orig = await page.evaluate(m => JSON.parse(JSON.stringify(S.redo[m].original)), m);
    ok(JSON.stringify(orig) === JSON.stringify(r1), 'original run preserved unchanged');
    ok(r3.design[k] === 'adv' && r3.missionCode === r1.missionCode && JSON.stringify(r3.simulatedEvents) === JSON.stringify(r1.simulatedEvents), 'revised run: changed hardware, same code, same external events');
    ok(MD.replay(r3).matches && JSON.stringify(r3.result) !== JSON.stringify(r1.result), `revised record replays in Node (${r1.result.score} -> ${r3.result.score}) and the outcome was re-computed`);
    ok((await page.locator('#comparePanel').innerText()).includes(String(r3.result.score)), 'comparison shows the revised engine score');
    console.log(`    ${m}: original ${r1.result.score} ${r1.result.outcome} | revised ${r3.result.score} ${r3.result.outcome}`);
  }
  // ---- P1: Wildfire orbit choice ----
  console.log('Wildfire Watch · orbit choice');
  await page.evaluate(() => go('missions')); await act('fstart');
  ok(await page.locator('.brief .ar').count() === 2, 'Wildfire briefing offers two orbits');
  await page.evaluate(() => { S.mission = 'storm'; go('brief'); }); ok(await page.locator('.brief .ar').count() === 0, 'Storm has no orbit choice (one fixed architecture, with a "why this orbit" note)');
  await page.evaluate(() => { S.mission = 'fire'; go('brief'); });
  await click('.ar[data-v="dawn-dusk-sso"]'); await click('.tg[data-t="F3"]'); await act('briefGo');
  await page.evaluate(() => { S.scn.fire = Scenario.generate('fire', '7K3QX'); S.scnMode.fire = 'class'; S.htp = {}; S.fdesign = { instrument: 'std', observation: 'std', power: 'std', comms: 'std', storage: 'std' }; render(); });
  ok(await page.evaluate(() => S.scn.fire.archView === 'dawn-dusk-sso' && S.scn.fire.code === 'FIRE-7K3QX'), 'Mission Code kept; event clock times follow the orbit');
  await act('mrr'); const chk = await page.locator('#layer').innerText(); ok(/4 contact windows, 4.5 h/.test(chk) && /Dawn-dusk/.test(chk), 'Design Check re-run for the selected orbit'); await act('goLaunch');
  await act('skip'); await page.waitForSelector('[data-a="faccept"]'); const al = await page.locator('#layer').innerText(); ok(/03:30/.test(al) && /04:30/.test(al) && !/02:00/.test(al), 'challenge text uses the orbit\'s pass and contact times');
  await page.evaluate(() => { document.querySelector('#layer').innerHTML = ''; go('fbuild'); }); await act('mrr'); await act('goLaunch'); await fly('fire');
  const a2 = await rec('fire'); ok(a2.architecture.id === 'dawn-dusk-sso' && a2.architecture.version === '1.0', 'record stores architecture id and version');
  ok(MD.replay(a2).matches, `dawn-dusk flight replays in Node to ${a2.result.score} ${a2.result.outcome}`);
  ok(/Dawn-dusk/.test(await page.locator('#verifyPanel').innerText()), 'report names the orbit flown');
  await act('improve'); ok(await page.locator('.md-redo ~ .ar-wrap .ar, .ar-wrap .ar').count() === 2, 'Improve My Mission lets the player change the orbit');
  await click('.ar[data-v="pm-sso"]'); await act('mrr'); await act('goLaunch'); await act('skip'); await page.waitForSelector('[data-a="redoSame"]'); await act('redoSame');
  const a1 = await rec('fire'); ok(a1.architecture.id === 'pm-sso' && a1.missionCode === a2.missionCode && JSON.stringify(a1.decisions) === JSON.stringify(a2.decisions), 'same code, same satellite, same decisions, other orbit');
  ok(MD.replay(a1).matches && JSON.stringify(a1.summary) !== JSON.stringify(a2.summary), `orbit change re-computed by the engine (${a2.result.score} ${a2.result.outcome} -> ${a1.result.score} ${a1.result.outcome})`);
  ok(/Orbit: Dawn-dusk orbit → /.test((await page.locator('#comparePanel').innerText()).replace(/\s+/g, ' ')), 'comparison names the orbit change');
  ok(errors.length === 0, 'no page errors' + (errors.length ? ': ' + errors.slice(0, 3).join(' | ') : ''));
  await browser.close(); console.log(`\n${n} end-to-end checks passed`);
})().catch(e => { console.error(e); process.exit(1); });
