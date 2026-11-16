#!/usr/bin/env node
/* Project ECHO: Resume Mission tests with real page reloads.
 *
 *   node tools/echo_resume.js [gameDir]
 *
 * Each case plays the real game in headless Chromium (Brave or Chrome) by clicking real buttons. A case is a list of segments.
 * In "reload" mode the page is reloaded (location.reload(): fresh JavaScript, same localStorage) after every segment and the
 * next segment begins with "Continue Mission" on the title screen. The same segments are also played in one page with no reload.
 * Both flights must end with the same score, outcome, gates, challenge log, decisions, simulated state and events, and the same
 * saved result / patch / XP bookkeeping. Other cases cover several players, a second mission, the 5-mission limit, damaged saves
 * and a browser with storage turned off.
 */
'use strict';
const fs = require('fs'), path = require('path'), { execFileSync } = require('child_process');
const BROWSER = process.env.BROWSER || ['/Applications/Brave Browser.app/Contents/MacOS/Brave Browser', '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome'].find(p => fs.existsSync(p));
const GAME = process.argv[2] || 'game';

function runPage(script, budget, head) {
  let src = fs.readFileSync(path.join(GAME, 'index.html'), 'utf8'); const i = src.lastIndexOf('</body>'), f = path.join(GAME, 'index-resume-test.html');
  src = src.slice(0, i) + '<script>' + script + '</script>' + src.slice(i);
  if (head) src = src.replace('<head>', '<head><script>' + head + '</script>');
  fs.writeFileSync(f, src);
  try {
    const out = execFileSync(BROWSER, ['--headless', '--disable-gpu', '--allow-file-access-from-files', '--force-prefers-reduced-motion', '--window-size=1440,900', '--virtual-time-budget=' + budget, '--dump-dom', 'file://' + path.resolve(f)], { maxBuffer: 1 << 28, stdio: ['ignore', 'pipe', 'ignore'] }).toString();
    const m = out.match(/<title>([\s\S]*?)<\/title>/); const t = (m ? m[1] : '').replace(/&quot;/g, '"').replace(/&amp;/g, '&').replace(/&lt;/g, '<').replace(/&gt;/g, '>');
    if (!t.startsWith('RES:')) throw new Error('page did not finish: ' + t.slice(0, 3000));
    return JSON.parse(t.slice(4));
  } finally { fs.unlinkSync(f); }
}

/* ---- in-page driver ---- */
const LIB = `
const q = s => document.querySelector(s), qa = s => [...document.querySelectorAll(s)], sleep = ms => new Promise(r => setTimeout(r, ms));
const T = window.sessionStorage, tget = (k, d) => { const v = T.getItem('t.' + k); return v == null ? d : JSON.parse(v); }, tset = (k, v) => T.setItem('t.' + k, JSON.stringify(v));
const checks = tget('checks', []), ok = (name, cond, info) => { checks.push([name, !!cond, cond ? '' : String(info === undefined ? '' : info)]); tset('checks', checks); };
const done = extra => { document.title = 'RES:' + JSON.stringify(Object.assign({ checks: tget('checks', []), recs: tget('recs', {}) }, extra || {})); };
const fail = e => { document.title = 'ERR:' + (e && e.stack || e) + ' | screen=' + (window.S && S.screen) + ' | seg=' + tget('seg', 0) + ' | ls=' + (()=>{try{return JSON.stringify(Object.keys(localStorage))+' '+localStorage.getItem('echo.profiles')}catch(e){return 'x'}})() + ' fid=' + JSON.stringify(window.ECHO&&ECHO.state.fid); };
window.addEventListener('error', e => fail(e.error || e.message)); window.addEventListener('unhandledrejection', e => fail(e.reason));
const hash = s => { let h = 5381; for (let i = 0; i < s.length; i++) h = ((h << 5) + h + s.charCodeAt(i)) | 0; return h; };
const until = async (f, ms, what) => { for (let t = 0; t < (ms || 60000); t += 50) { if (f()) return; await sleep(50); } throw new Error('timeout: ' + what + ' screen=' + S.screen); };
const ACC = '[data-a="accept"],[data-a="faccept"],[data-a="laccept"]', RUN = '[data-a="run"],[data-a="frun"],[data-a="lrun"]', NEXT = '[data-a="next"],[data-a="fnext"],[data-a="lnext"]';
const STARTA = { storm: 'startMission', fire: 'fstart', flood: 'lstart' };
let simCalls = 0; { const w = f => function () { simCalls++; return f.apply(this, arguments); }; simulate = w(simulate); fsim = w(fsim); lsim = w(lsim); }
let beats = 0; { const sx = ECHO.sfx, w = f => function () { beats++; return f.apply(this, arguments); }; sx.win = w(sx.win); sx.low = w(sx.low); }
const xp = () => SAVE.xp, patches = () => SAVE.patches.length;
function record(m) { const st = MX[m].st(), Eg = MX[m].eng, sc = Eg.score(st.M), d = Eg.derive(st.M);
  return { total: sc.total, outcome: sc.outcome, gates: sc.gates, parts: [sc.sci, sc.del, sc.eff, sc.rel], log: st.log.map(L => [!!L.met, L.badge, L.choices, L.good, L.trade]),
    choice: st.choice, ext: st.M.ext, state: hash(JSON.stringify(d)), events: hash(JSON.stringify(MX[m].events(st.M))), trace: st.M.trace.length, attempt: st.attempt,
    record: st.record ? hash(JSON.stringify(Object.assign({}, st.record, { createdAt: 0, at: 0, time: 0 }))) : null }; }
const hot = async () => { q('.rhot.is-go').click(); await sleep(80); };
const play = async m => { ECHO.test.fast(); };
const A = {
  profile: async (m, a) => { const P = ECHO.profiles, d = P.data(), p = d.list.find(x => x.name === a); if (p) P.use(p.id); else P.create(a); render(); },
  start: async (m) => { go('missions'); await sleep(30); q('[data-a="' + STARTA[m] + '"]').click(); await sleep(80); },
  code: async (m, c) => { S.scn[m] = Scenario.generate(m, c); S.scnMode[m] = c === 'PRACTICE' ? 'practice' : 'class'; },
  goal: async (m, a) => { await hot(); if (a && a.arch) { q('[data-a="pickArch"][data-v="' + a.arch + '"]').click(); await sleep(30); } qa('[data-a="pickTarget"]')[a && a.t || 0].click(); await sleep(30); q('[data-a="briefGo"]').click(); await sleep(80); },
  design: async (m, set) => { await hot(); const d = MX[m].design(); Object.keys(d).forEach((k, i) => { d[k] = set === 0 ? 'std' : set === 1 ? 'adv' : i % 2 ? 'adv' : 'std'; }); render(); await sleep(30); q('[data-a="mrr"]').click(); await sleep(80); },
  launch: async (m) => { await hot(); const g = q('#layer [data-a="goLaunch"]'); if (!g || g.disabled) throw new Error('launch check refused: ' + JSON.stringify(MX[m].design())); g.click(); await until(() => S.screen === 'room' && MX[m].st() && ECHO.state.launched[m], 20000, 'launch'); await sleep(200); },
  // the player's own decisions for challenge ci (set "set"), including direct controls
  decide: async (m, ci, set, alt) => { const st = MX[m].st();
    st.choice[ci] = chx(m, ci).groups.map((g, gi) => g.opts[(alt ? g.opts.length - 1 : set === 0 ? 0 : set === 1 ? Math.min(1, g.opts.length - 1) : (ci + gi) % Math.min(2, g.opts.length))][0]);
    if (m === 'storm' && ci === 0) { ixGet(); ixSetBox(alt ? { x: .3, y: .3, w: .9 } : { x: .46, y: .42, w: .6 }); }
    if (m === 'fire' && (ci === 0 || ci === 3)) { fireTask(); S.f.task[ci].regions = alt ? ['C'] : ci === 0 ? ['A', 'B'] : ['B']; fireTask(); }
    if (m === 'storm' && ci === 3 && q('[data-a="c4Move"]')) { const b = q(alt ? '[data-a="c4Move"][data-k="1"][data-d="-1"]' : '[data-a="c4Move"][data-k="0"][data-d="1"]'); if (b) b.click(); const u = qa('[data-a="c4Move"][data-d="-1"]:not([disabled])').pop(); if (u && !alt) u.click(); }
    if (m === 'flood' && ci === 0) { floodTask(); S.l.task[0].zones = alt ? ['ALL', 'ALL'] : S.l.M.C.targets[0].slice(); floodTask(); }
    render(); await sleep(30); },
  ch: async (m, a) => { const ci = a.ci; await hot(); await until(() => q(ACC), 5000, 'alert ' + ci); q(ACC).click(); await sleep(60); await A.decide(m, ci, a.set);
    const n0 = simCalls; q(RUN).click(); await until(() => MX[m].st().phase === 'result' && q(NEXT), 120000, 'result ' + ci);
    ok(m + ' c' + (ci + 1) + ' engine ran once', simCalls - n0 === 1, simCalls - n0);
    if (!a.stay) { q(NEXT).click(); await sleep(450); } },
  // open a challenge and change things without confirming: none of this may survive a reload
  mid: async (m, a) => { await hot(); await until(() => q(ACC), 5000, 'alert'); q(ACC).click(); await sleep(60); await A.decide(m, a.ci, a.set, true); tset('midci', a.ci); },
  report: async (m) => { await until(() => ECHO.stage(m) === 'report' && S.screen === 'room', 10000, 'report stage'); await hot(); await until(() => q('.cr'), 5000, 'report'); await sleep(900); },
  improve: async (m, a) => { q('.acts-row [data-a="improve"]').click(); await sleep(120); const d = MX[m].design(), k = Object.keys(d)[a.part || 0]; d[k] = d[k] === 'std' ? 'adv' : 'std'; render(); await sleep(30); q('[data-a="mrr"]').click(); await sleep(80); },
  redo: async (m, a) => { await hot(); await until(() => q('[data-a="redoSame"]'), 5000, 'redo modal'); q(a.same ? '[data-a="redoSame"]' : '[data-a="redoNew"]').click(); await sleep(300); },
};
// Continue Mission from the title screen (or from the mission card), then check that the flight is exactly where it was saved
async function cont(m, via) { await until(() => S.screen === 'title', 3000, 'title'); const before = tget('before', null);
  const b = via === 'card' ? (go('missions'), q('.e-ep.ep-' + m + ' [data-e="contFlight"]')) : q('.e-title-card [data-e="contFlight"]');
  ok('continue button offered (' + (via || 'title') + ')', !!b); const xp0 = xp(), r0 = (ECHO.profiles.cur() || { results: [] }).results.length, n0 = simCalls; beats = 0;
  b.click(); await sleep(150);
  const st = MX[m].st(), E = ECHO.state;
  ok('continue lands in the Mission Room', S.screen === 'room' && S.mission === m, S.screen);
  if (before) { ok('restored step matches the saved step (' + before.stage + ')', ECHO.stage(m) === before.stage, ECHO.stage(m) + ' vs ' + before.stage);
    ok('Mission Code restored', S.scn[m].code === before.code); ok('bonus goal restored', S.target[m] === before.target); ok('design restored', JSON.stringify(MX[m].design()) === before.design);
    if (m === 'fire') ok('orbit restored', archOf('fire') === before.arch);
    if (before.launched) { ok('completed challenges re-computed once each, nothing else', simCalls - n0 === before.done, simCalls - n0 + ' vs ' + before.done);
      ok('engine state equals the state before the reload', hash(JSON.stringify(MX[m].eng.derive(st.M))) === before.state, 'state differs');
      ok('challenge log equals the log before the reload', JSON.stringify(st.log.slice(0, before.done).map(L => [L.met, L.badge, L.choices])) === before.log);
      ok('decisions of finished challenges kept', JSON.stringify(st.choice.slice(0, before.done)) === before.choice);
      ok('controls of finished challenges kept', JSON.stringify((st.M.ext || []).slice(0, before.done)) === before.ext);
      ok('attempt info kept', JSON.stringify(st.attempt) === before.attempt, JSON.stringify(st.attempt) + ' vs ' + before.attempt);
      if (before.done < 4) ok('next challenge waits at its start', st.ci === before.done && st.phase === 'alert'); }
    if (before.mid != null) ok('unconfirmed choices of the open challenge are not kept', !(st.M.ext || [])[before.mid] && JSON.stringify(st.choice[before.mid]) === JSON.stringify(MX[m].CH[before.mid].groups.map(g => g.opts[0][0])), JSON.stringify(st.choice[before.mid]) + ' unconfirmed was ' + before.midChoice);
    ok('no XP and no saved result from continuing', xp() === xp0 && (ECHO.profiles.cur() || { results: [] }).results.length === r0);
    if (before.seenHere) ok('story for this step is not repeated', beats === 0, beats); } }
function noteBefore(m) { const st = MX[m].st(), E = ECHO.state, launched = !!(E.launched[m] && st);
  let done = 0; if (launched) done = st.phase === 'result' ? st.ci + 1 : st.ci;
  const stage = launched && st.phase === 'result' && st.ci < 3 ? 'c' + (st.ci + 1) : ECHO.stage(m), mid = tget('midci', null); tset('midci', null);
  tset('before', { stage, code: S.scn[m].code, target: S.target[m], design: JSON.stringify(MX[m].design()), arch: m === 'fire' ? archOf('fire') : null, launched, done,
    state: launched ? hash(JSON.stringify(MX[m].eng.derive(st.M))) : 0, log: launched ? JSON.stringify(st.log.slice(0, done).map(L => [L.met, L.badge, L.choices])) : '',
    choice: launched ? JSON.stringify(st.choice.slice(0, done)) : '', ext: launched ? JSON.stringify((st.M.ext || []).slice(0, done)) : '', attempt: launched ? JSON.stringify(st.attempt) : '',
    mid: mid, midChoice: mid != null ? JSON.stringify(st.choice[mid]) : '', seenHere: !!E.seen[m + ':' + ECHO.stage(m) + ':' + E.run[m]] && !(st && st.phase === 'result') }); }
`;

const CASE = (segs, reload, m) => LIB + `
window.addEventListener('load', () => setTimeout(async () => { try {
  const SEGS = ${JSON.stringify(segs)}, RELOAD = ${reload}, m = ${JSON.stringify(m)};
  let i = tget('seg', 0); ECHO.test.fast();
  if (i > 0 && RELOAD) await cont(m, SEGS[i].via);
  for (; i < SEGS.length; i++) {
    for (const [act, arg] of SEGS[i].do) { if (!RELOAD && act === 'mid') continue; await A[act](m, RELOAD || !arg || typeof arg !== 'object' ? arg : Object.assign({}, arg, { stay: false })); }
    if (SEGS[i].rec) { const r = record(m), p = ECHO.profiles.cur(); r.xp = xp(); r.patches = patches(); r.results = p ? p.results.filter(x => x.m === m).length : 0; r.unfinished = ECHO.saves.list().length; r.compare = !!q('#comparePanel');
      const recs = tget('recs', {}); recs[SEGS[i].rec] = r; tset('recs', recs); }
    if (RELOAD && i < SEGS.length - 1) { noteBefore(m); tset('seg', i + 1); await sleep(50); location.reload(); return; }
  }
  done();
} catch (e) { fail(e); } }, 400));`;

/* ---- the flights ---- */
const flight = (m, opt) => { const set = opt.set, segs = [
  { do: [['profile', 'Ana'], ['code', opt.code], ['start'], ['code', opt.code], ['goal', { arch: opt.arch, t: opt.t }]] },  // reload 1: after goal
  { do: [['design', set]] },                                                                                                 // reload 2: after build
  { do: [['launch']] },                                                                                                      // reload 3: after launch
  { do: [['mid', { ci: 0, set }]] },                                                                                         // reload 4: during challenge 1
  { do: [['ch', { ci: 0, set }]] },                                                                                          // reload 5: after challenge 1
  { do: [['mid', { ci: 1, set }]] },                                                                                         // during challenge 2
  { do: [['ch', { ci: 1, set, stay: true }]] },                                                                              // after challenge 2, result still on screen
  { via: 'card', do: [['mid', { ci: 2, set }]] },                                                                            // continue from the mission card
  { do: [['ch', { ci: 2, set }]] },
  { do: [['mid', { ci: 3, set }]] },
  { do: [['ch', { ci: 3, set }]] },                                                                                          // after the last challenge: report next
  { do: [['report']], rec: 'end' }];
  return segs; };
const rewind = (m, opt) => flight(m, opt).slice(0, -1).concat([
  { do: [['report'], ['improve', { part: 1 }]], rec: 'first' },             // finished flight 1, then Rewind: change one part, build again
  { do: [['launch']] },                                                    // reload after the relaunch, before choosing how to fly
  { do: [['redo', { same: false }], ['ch', { ci: 0, set: opt.set }]] },    // new decisions for challenge 1
  { do: [['ch', { ci: 1, set: opt.set }]] }, { do: [['ch', { ci: 2, set: opt.set }], ['ch', { ci: 3, set: opt.set }]] },
  { do: [['report']], rec: 'end' }]);
const rewindSame = (m, opt) => flight(m, opt).slice(0, -1).concat([
  { do: [['report'], ['improve', { part: 0 }]], rec: 'first' }, { do: [['launch']] },
  { do: [['redo', { same: true }], ['report']], rec: 'end' }]);

const CASES = process.env.C4ONLY ? [] : [
  ['storm', 'PRACTICE', { set: 0 }, flight], ['storm', 'ECHO-TEST-1', { set: 2, t: 1 }, flight],
  ['fire', 'ECHO-TEST-1', { set: 0, arch: 'dawn-dusk-sso' }, flight], ['fire', 'PRACTICE', { set: 2 }, flight],
  ['flood', 'ECHO-TEST-2', { set: 2, t: 2 }, flight], ['flood', 'PRACTICE', { set: 0, t: 1 }, flight],
  ['storm', 'ECHO-TEST-2', { set: 0 }, rewind], ['fire', 'ECHO-TEST-2', { set: 0 }, rewindSame]];

/* ---- players, a second mission, the limit, damaged saves, storage off ---- */
const PLAYERS = LIB + `
window.addEventListener('load', () => setTimeout(async () => { try {
  ECHO.test.fast(); const P = ECHO.profiles, Sv = ECHO.saves, i = tget('seg', 0);
  const names = l => l.map(f => f.m).sort().join(',');
  if (i === 0) {
    await A.profile(null, 'Ana'); await A.start('storm'); await A.goal('storm'); await A.design('storm', 0); await A.launch('storm'); await A.ch('storm', { ci: 0, set: 0 });
    const ana = P.cur().id; tset('ana', ana);
    await A.profile(null, 'Ben'); go('title'); await sleep(50);
    ok('switching player: Ben sees no Continue for Ana', !q('[data-e="contFlight"]'));
    await A.start('fire'); await A.goal('fire'); tset('ben', P.cur().id);
    ok('Ben has only his own flight', names(Sv.list()) === 'fire', names(Sv.list()));
    ok('Ana still has hers', names(Sv.list(ana)) === 'storm', names(Sv.list(ana)));
    await A.profile(null, 'Ana'); go('title'); await sleep(50);
    const t = q('.e-title-card [data-e="contFlight"]'); ok('switching back: Ana sees Continue for Storm Watch', t && /Storm Watch/.test(t.textContent) && /Challenge 2 of 4/.test(t.textContent), t && t.textContent);
    // a second Storm flight does not remove the first one
    await A.start('storm'); await A.goal('storm', { t: 2 });
    ok('starting another mission keeps the unfinished one', Sv.list().filter(f => f.m === 'storm').length === 2);
    tset('seg', 1); location.reload(); return; }
  if (i === 1) {
    const ana = tget('ana'), ben = tget('ben');
    ok('after reload Ana has two Storm flights', Sv.list(ana).length === 2 && Sv.list(ana).every(f => f.m === 'storm'));
    ok('after reload Ben has one Wildfire flight', names(Sv.list(ben)) === 'fire');
    P.use(ana); render(); go('missions'); await sleep(50);
    const c = q('.e-ep.ep-storm [data-e="contFlight"]'); ok('mission card continues the most recent Storm flight', c && /Challenge|Goal chosen/.test(c.textContent));
    ok('other mission cards show no Continue for Ana', !q('.e-ep.ep-fire [data-e="contFlight"]'));
    // older flight from My Account
    ECHO.account(); await sleep(30); const rows = qa('.ac-fl-row'); ok('My Account lists unfinished missions', rows.length === 2, rows.length);
    ok('each row shows mission, Mission Code, progress and date', rows.every(r => /Storm Watch/.test(r.textContent) && r.querySelector('code') && /Saved/.test(r.textContent)));
    const older = Sv.list(ana)[1]; q('.ac-fl-row [data-fid="' + older.fid + '"][data-e="contFlight"]').click(); await sleep(150);
    ok('older flight continues from My Account', S.screen === 'room' && ECHO.state.fid.storm === older.fid && ECHO.stage('storm') === 'c1', ECHO.stage('storm'));
    // limit of five
    await A.start('fire'); await A.goal('fire'); await A.start('flood'); await A.goal('flood'); await A.start('flood'); await A.goal('flood', { t: 1 });
    ok('five unfinished missions saved', Sv.list().length === 5, Sv.list().length);
    const before = JSON.stringify(Sv.list()); go('missions'); await sleep(30); q('[data-a="startMission"]').click(); await sleep(80);
    ok('sixth mission is blocked with a message', q('#echoAcct:not([hidden]) .ac-limit') && S.screen === 'missions' && JSON.stringify(Sv.list()) === before);
    q('.ac-fl-row [data-e="flDel"]').click(); await sleep(30); ok('delete asks first', q('[data-e="flDelYes"]')); q('[data-e="flDelYes"]').click(); await sleep(30);
    ok('deleted after confirming', Sv.list().length === 4); q('[data-e="acctClose"]').click();
    go('missions'); await sleep(30); q('[data-a="startMission"]').click(); await sleep(80); ok('a new mission can start again', S.screen === 'room' && ECHO.stage('storm') === 'goal');
    // damaged saves: one bad entry among good ones, then a fully broken list
    const k = 'echo.flights.v1.' + ana, d = JSON.parse(localStorage.getItem(k)); d.list.push({ v: 1, fid: 'bad', m: 'storm', stage: 'flight', done: 9 }); localStorage.setItem(k, JSON.stringify(d));
    localStorage.setItem('echo.flights.v1.' + ben, '{not json');
    tset('seg', 2); location.reload(); return; }
  if (i === 2) {
    const ana = tget('ana'), ben = tget('ben');
    ok('damaged entry is set aside, the good ones stay', Sv.list(ana).length === 4 && !Sv.list(ana).some(f => f.fid === 'bad'), Sv.list(ana).length);
    ok('a damaged list does not stop the game', Array.isArray(Sv.list(ben)) && Sv.list(ben).length === 0);
    ok('damaged data is kept aside, not overwritten', Object.keys(localStorage).some(x => x.startsWith('echo.flights.broken.')));
    go('title'); await sleep(30); ok('title shows a plain notice', q('.e-savenote') && !/JSON|replay|state/i.test(q('.e-savenote').textContent), q('.e-savenote') && q('.e-savenote').textContent);
    const f = q('.e-title-card [data-e="contFlight"]'); f.click(); await sleep(150); ok('continuing still works after the repair', S.screen === 'room');
    done(); } } catch (e) { fail(e); } }, 400));`;

const NOSTORE_HEAD = `Object.defineProperty(window, 'localStorage', { configurable: true, get() { throw new Error('storage blocked'); } });`;
const NOSTORE = LIB.replace("const xp = () => SAVE.xp", "const xp = () => SAVE.xp") + `
window.addEventListener('load', () => setTimeout(async () => { try {
  ECHO.test.fast(); const Sv = ECHO.saves;
  ok('game loads with storage blocked', S.screen === 'title');
  ECHO.profiles.create('Cy'); ok('a player can still be made for this page', ECHO.profiles.cur() && ECHO.profiles.cur().name === 'Cy');
  await A.start('flood'); await A.goal('flood'); await A.design('flood', 0); await A.launch('flood'); await A.ch('flood', { ci: 0, set: 0 });
  ok('flight kept for this page session', Sv.list().length === 1 && Sv.list()[0].done === 1);
  go('title'); await sleep(30); ok('title says progress is not being saved', q('.e-savenote') && /not saving/.test(q('.e-savenote').textContent));
  q('.e-title-card [data-e="contFlight"]').click(); await sleep(150); ok('continue works inside the page', S.screen === 'room' && ECHO.stage('flood') === 'c1');
  for (let ci = 1; ci < 4; ci++) await A.ch('flood', { ci, set: 0 }); await A.report('flood');
  ok('report works and the flight is finished', q('.cr') && Sv.list().length === 0 && ECHO.profiles.cur().results.length === 1);
  done(); } catch (e) { fail(e); } }, 400));`;


/* ---- XP and patches per player, earlier shared XP, guests ---- */
const fullFlight = `await A.start(m); await A.goal(m); await A.design(m, 0); await A.launch(m); for (let ci = 0; ci < 4; ci++) await A.ch(m, { ci, set: 0 }); await A.report(m);`;
const XPCASE = LIB + `
window.addEventListener('load', () => setTimeout(async () => { try {
  ECHO.test.fast(); const P = ECHO.profiles, i = tget('seg', 0), btn = () => q('#xpBtn').textContent, LEG = JSON.stringify({ xp: 230, patches: [{ m: 'storm', code: 'OLD-1', stars: 2, score: 80 }, { m: 'flood', code: 'OLD-2', stars: 1, score: 50 }], streak: 1 });
  const who = n => P.data().list.find(p => p.name === n);
  if (i === 0) { localStorage.clear(); localStorage.setItem('earthMissions.save.v1', LEG); tset('seg', 1); location.reload(); return; }
  if (i === 1) {
    ok('before any player: earlier XP is not shown as anyone\\'s', !P.cur());
    await A.profile(null, 'Ana'); ok('new player starts at 0 XP and no patches', SAVE.xp === 0 && SAVE.patches.length === 0 && /^★ 0 XP/.test(btn()), btn());
    go('title'); await sleep(30); ok('title points to the earlier progress', q('.e-savenote') && /Earlier XP/.test(q('.e-savenote').textContent));
    let m = 'storm'; ${fullFlight}
    const a = SAVE.xp; ok('Ana earns XP and one patch from her flight', a > 0 && SAVE.patches.length === 1 && who('Ana').xp.xp === a, a);
    ok('earlier shared save is left untouched', localStorage.getItem('earthMissions.save.v1') === LEG);
    await A.profile(null, 'Ben'); ok('Ben starts at 0 even after Ana played', SAVE.xp === 0 && SAVE.patches.length === 0 && /^★ 0 XP/.test(btn()), btn());
    ECHO.account(); await sleep(30); q('[data-e="acctUse"][data-id="' + who('Ana').id + '"]').click(); await sleep(30);
    ok('switching to Ana shows her XP at once', SAVE.xp === a && btn().startsWith('★ ' + a + ' XP'), btn());
    ok('My Account shows her XP and patches', q('.ac-xp') && q('.ac-xp').textContent.includes(a + ' XP') && /1 mission patch\\b/.test(q('.ac-xp').textContent));
    ok('earlier progress offered once, with a choice of player', q('.ac-legacy') && qa('#legacyTo option').length === 2);
    q('#legacyTo').value = who('Ben').id; q('[data-e="legacyGive"]').click(); await sleep(30);
    ok('Ben receives the earlier XP and patches', who('Ben').xp.xp === 230 && who('Ben').xp.patches.length === 2);
    ok('Ana is unchanged', who('Ana').xp.xp === a && SAVE.xp === a);
    ok('the offer is gone after the choice', !q('.ac-legacy'));
    tset('a', a); tset('seg', 2); location.reload(); return; }
  if (i === 2) { const a = tget('a');
    ok('after reload each player keeps their own XP', who('Ana').xp.xp === a && who('Ben').xp.xp === 230 && SAVE.xp === a);
    ECHO.account(); await sleep(30); ok('the earlier-progress offer does not come back', !q('.ac-legacy'));
    q('[data-e="acctUse"][data-id="' + who('Ben').id + '"]').click(); await sleep(30); ok('Ben now shows 230 XP', SAVE.xp === 230 && btn().startsWith('★ 230 XP'), btn());
    // a second flight by Ben: XP adds to Ben only
    let m = 'flood'; ${fullFlight}
    ok('Ben\\'s flight adds only to Ben', who('Ben').xp.xp > 230 && who('Ana').xp.xp === a);
    done(); } } catch (e) { fail(e); } }, 400));`;
const LEAVE = LIB + `
window.addEventListener('load', () => setTimeout(async () => { try {
  ECHO.test.fast(); const P = ECHO.profiles, i = tget('seg', 0), LEG = JSON.stringify({ xp: 90, patches: [], streak: 0 });
  if (i === 0) { localStorage.clear(); localStorage.setItem('earthMissions.save.v1', LEG); tset('seg', 1); location.reload(); return; }
  if (i === 1) { await A.profile(null, 'Cy'); ECHO.account(); await sleep(30); ok('offer shown', q('.ac-legacy')); q('[data-e="legacyLeave"]').click(); await sleep(30);
    ok('leave unassigned: nobody gets it', SAVE.xp === 0 && P.cur().xp == null || (P.cur().xp && P.cur().xp.xp === 0)); ok('offer closed', !q('.ac-legacy'));
    tset('seg', 2); location.reload(); return; }
  ok('after reload the offer stays closed', (ECHO.account(), !q('.ac-legacy'))); ok('earlier save still kept, unassigned', localStorage.getItem('earthMissions.save.v1') === LEG && SAVE.xp === 0);
  done(); } catch (e) { fail(e); } }, 400));`;
const GUESTCASE = LIB + `
window.addEventListener('load', () => setTimeout(async () => { try {
  const i = tget('seg', 0);
  if (i === 0) { localStorage.clear(); tset('seg', 1); location.reload(); return; }
  if (i === 1) { q('[data-e="begin"]').click(); await sleep(60); ok('first start offers Play as guest', q('#echoAcct:not([hidden]) [data-e="acctGuest"]'));
    q('[data-e="acctGuest"]').click(); await sleep(60); ECHO.test.fast(); go('title'); await sleep(30);
    ok('title marks the guest clearly', q('.e-guest') && /Guest — progress not saved/.test(q('.e-guest').textContent));
    ok('XP button marks the guest', /Guest/.test(q('#xpBtn').textContent));
    let m = 'fire'; await A.start(m); await A.goal(m); await A.design(m, 0); await A.launch(m); await A.ch(m, { ci: 0, set: 0 });
    ok('guest flight can be continued in this page', ECHO.saves.list().length === 1);
    for (let ci = 1; ci < 4; ci++) await A.ch(m, { ci, set: 0 }); await A.report(m);
    ok('guest earns XP in this page', SAVE.xp > 0); ok('nothing written for the guest', !Object.keys(localStorage).some(k => /flights|profiles/.test(k) && (localStorage.getItem(k) || '').includes('"xp"')) && !(ECHO.profiles.data().list.length));
    ECHO.account(); await sleep(30); ok('My Account warns the guest', q('.ac-guest') && /not saved/.test(q('.ac-guest').textContent));
    q('[data-e="acctClose"]').click();
    await A.start('storm'); await A.goal('storm'); tset('seg', 2); location.reload(); return; }
  ok('after reload the guest progress is gone', SAVE.xp === 0 && ECHO.saves.list().length === 0 && !q('[data-e="contFlight"]'));
  q('[data-e="begin"]').click(); await sleep(60); ok('a refreshed guest is asked again', q('#echoAcct:not([hidden])'));
  done(); } catch (e) { fail(e); } }, 400));`;


/* ---- Storm Watch Challenge 4 ranking ---- */
const C4CASE = LIB + `
window.addEventListener('load', () => setTimeout(async () => { try {
  const Q = sel => { const e = q(sel); if (!e) throw new Error('missing ' + sel + ' screen ' + S.screen); return e; }; ECHO.test.fast(); const m = 'storm'; await A.profile(null, 'Di'); await A.code(m, 'ECHO-TEST-2'); await A.start(m); await A.code(m, 'ECHO-TEST-2'); await A.goal(m); await A.design(m, 2); await A.launch(m);
  for (let ci = 0; ci < 3; ci++) await A.ch(m, { ci, set: 1 });
  await hot(); await until(() => q(ACC), 5000, 'alert'); q(ACC).click(); await sleep(80);
  const st = MX.storm.st(), x = st.ix[3], n = x.order.length, base = x.order.slice(), five = C4UI.fiveIds(st.M), s0 = simCalls, sorted = a => a.slice().sort((p, q) => p - q).join();
  ok('queue has more than five images', n > 5, n); if (n <= 5) { done(); return; } ok('the ranking edits the engine structure', st.M.ext[3] === x);
  ok('exactly five cards', qa('.c4c').length === Math.min(5, n), qa('.c4c').length);
  ok('the five: default top picks plus the newest image', five.length === 5 && onboard(st.M).slice(0, 4).every(r => five.includes(r.id)) && five.includes(onboard(st.M).slice().sort((a, b) => b.t - a.t || b.id - a.id)[0].id));
  ok('explains why these five', /scientific value and freshness/.test(q('#ixPanel').textContent));
  ok('Kim\\'s tip with both ways to move', /Drag and drop the images.*↑ and ↓/.test(q('.c4kim').textContent) && /Drag to reorder, or use ↑ ↓/.test(q('.c4hint').textContent));
  ok('first ↑ and last ↓ disabled', Q('.c4c:first-child [data-d="-1"]').disabled && Q('.c4c:last-child [data-d="1"]').disabled);
  const nums = () => qa('.c4n').map(e => +e.textContent), idsShown = () => qa('.c4m b').map(e => +e.textContent.replace(/\\D/g, ''));
  ok('cards show their real queue positions', JSON.stringify(nums()) === JSON.stringify(C4UI.shown().map(v => v[1] + 1)));
  const hidden = base.map((id, i) => [id, i]).filter(v => !five.includes(v[0]));
  const id0 = idsShown()[0], id1 = idsShown()[1];
  Q('.c4c:first-child [data-d="1"]').click(); await sleep(30); const viaBtn = x.order.slice();
  ok('↓ moves the first card one place down', idsShown()[0] === id1 && idsShown()[1] === id0 && JSON.stringify(nums()) === JSON.stringify(C4UI.shown().map(v => v[1] + 1)));
  x.order.splice(0, n, ...base); ECHO.test.fast(); render(); await sleep(30);
  // drag the first card down by one step
  const h = Q('.c4c:first-child [data-c4="grab"]'), r0 = Q('.c4c:nth-child(1)').getBoundingClientRect(), r1 = Q('.c4c:nth-child(2)').getBoundingClientRect(), y = r0.top + 10;
  h.dispatchEvent(new PointerEvent('pointerdown', { bubbles: true, clientY: y, pointerId: 1 })); document.dispatchEvent(new PointerEvent('pointermove', { bubbles: true, clientY: y + (r1.top - r0.top), pointerId: 1 }));
  ok('while dragging the card is highlighted', Q('.c4c.dragging')); document.dispatchEvent(new PointerEvent('pointerup', { bubbles: true, pointerId: 1 })); await sleep(30);
  ok('drag and buttons give the same queue', JSON.stringify(x.order) === JSON.stringify(viaBtn), JSON.stringify(x.order) + ' vs ' + JSON.stringify(viaBtn));
  x.order.splice(0, n, ...base); render(); await sleep(30);
  Q('.c4c:first-child [data-c4="grab"]').dispatchEvent(new KeyboardEvent('keydown', { key: 'ArrowDown', bubbles: true })); await sleep(30);
  ok('keyboard gives the same queue', JSON.stringify(x.order) === JSON.stringify(viaBtn));
  // move the newest (5th card) to the top in the five view: hidden images keep their places
  for (let k = 4; k > 0; k--) { Q('.c4c:nth-child(' + (k + 1) + ') [data-d="-1"]').click(); await sleep(20); }
  ok('hidden images never move in the five-card view', hidden.every(v => x.order[v[1]] === v[0]));
  ok('no image removed or duplicated', sorted(x.order) === sorted(base) && x.order.length === n);
  const keep = x.order.slice(); Q('[data-a="c4All"]').click(); await sleep(30);
  ok('Show all lists every image', qa('.c4c').length === n && JSON.stringify(x.order) === JSON.stringify(keep));
  Q('.c4c:last-child [data-d="-1"]').click(); await sleep(30); const full = x.order.slice();
  ok('full view moves any image', JSON.stringify(full) !== JSON.stringify(keep) && sorted(full) === sorted(base));
  Q('[data-a="c4All"]').click(); await sleep(30); ok('switching views keeps the ranking', JSON.stringify(x.order) === JSON.stringify(full) && qa('.c4c').length === 5);
  Q('[data-a="opt"][data-g="0"][data-v="fast"]').click(); await sleep(30); Q('[data-a="ixNew"][data-v="0"]').click(); await sleep(30);
  ok('settings still work and keep the ranking', st.choice[3][0] === 'fast' && x.newFirst === false && JSON.stringify(x.order) === JSON.stringify(full));
  ok('plan shows delivery, fresh image and battery', /of \\d+ waiting/.test(q('.c4plan').textContent) && /storm image/.test(q('.c4plan').textContent) && /Lowest battery/.test(q('.c4plan').textContent));
  ok('Kim sits under Mission Overview, not in the top bar', q('.side .mo + .e-sidekim .e-sk-say') && !q('.nav .e-navface'));
  ok('nothing ran before Confirm', simCalls === s0 && st.phase === 'choose' && st.ci === 3);
  const want = x.order.slice(); q(RUN).click(); await until(() => st.phase === 'result', 120000, 'run');
  ok('Confirm runs once with the chosen ranking', simCalls === s0 + 1 && JSON.stringify(st.M.ext[3].order) === JSON.stringify(want));
  q(NEXT).click(); await sleep(400); await A.report(m);
  const sm = q('details.cr-full > summary'); const kh = q('details.cr-full + .e-kimhint'); ok('Kim stands beside the report button, outside it', kh && !sm.querySelector('.e-kimhint') && /Click here/.test(kh.textContent));
  sm.click(); await sleep(30); ok('opening the report hides Kim for good', q('details.cr-full').open && !q('.e-kimhint')); sm.click(); render(); await sleep(30); ok('closing does not bring Kim back', !q('.e-kimhint'));
  done(); } catch (e) { fail(e); } }, 400));`;

/* ---- run ---- */
let pass = 0, failN = 0; const bad = [];
const tally = (tag, res) => res.checks.forEach(c => { if (c[1]) pass++; else { failN++; bad.push(tag + ': ' + c[0] + (c[2] ? ' (' + c[2] + ')' : '')); } });
const same = (tag, a, b, keys) => keys.forEach(k => { const x = JSON.stringify(a[k]), y = JSON.stringify(b[k]); if (x === y) pass++; else { failN++; bad.push(tag + ': ' + k + ' differs\n    reload:    ' + x.slice(0, 300) + '\n    no reload: ' + y.slice(0, 300)); } });
const KEYS = ['total', 'outcome', 'gates', 'parts', 'log', 'choice', 'ext', 'state', 'events', 'trace', 'attempt', 'record', 'xp', 'patches', 'results', 'unfinished', 'compare'];
for (const [m, code, opt, make] of CASES) {
  const segs = make(m, opt), tag = `${m} ${code} set ${opt.set}${opt.arch ? ' ' + opt.arch : ''}${make === rewind ? ' rewind' : make === rewindSame ? ' rewind-same' : ''}`;
  const a = runPage(CASE(segs, true, m), 3000000), b = runPage(CASE(segs, false, m), 3000000);
  tally(tag + ' (reload)', a); tally(tag + ' (no reload)', b);
  for (const k of Object.keys(b.recs)) same(tag + ' [' + k + ']', a.recs[k], b.recs[k], KEYS);
  const e = a.recs.end; if (e.results === (make === flight ? 1 : 2) && e.unfinished === 0) pass++; else { failN++; bad.push(tag + ': expected one saved result per flight and no unfinished mission, got ' + e.results + ' / ' + e.unfinished); }
  if (make !== flight) { if (e.compare && e.attempt && e.attempt.n === 2) pass++; else { failN++; bad.push(tag + ': before/after comparison missing or attempt not 2: ' + JSON.stringify(e.attempt)); } }
  console.log(`${tag}: ${a.checks.length + b.checks.length} checks, ${segs.length - 1} reloads, score ${e.total} ${e.outcome}`);
}
if (!process.env.C4ONLY) { const p = runPage(PLAYERS, 3000000); tally('players', p); console.log(`players / limit / damaged saves: ${p.checks.length} checks`);
const n = runPage(NOSTORE, 3000000, NOSTORE_HEAD); tally('storage off', n); console.log(`storage off: ${n.checks.length} checks`); }
for (const [name, page] of [['challenge 4 ranking', C4CASE], ['per-player XP', XPCASE], ['leave earlier XP unassigned', LEAVE], ['guest', GUESTCASE]]) { const r = runPage(page, 3000000); tally(name, r); console.log(`${name}: ${r.checks.length} checks`); }
bad.forEach(x => console.log('FAIL ' + x));
console.log(`${pass} resume checks passed, ${failN} failed`); process.exit(failN ? 1 : 0);
