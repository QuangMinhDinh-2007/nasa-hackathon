/* Earth Missions — upgrade layer (v5): Mission Codes, live mission journey, Mission Control crew + Pip the bird,
 * voice, readiness review, what-if replay, sources panel. Presentation only: every number shown here is read from
 * the deterministic engines. Nothing in this file changes a simulation result.
 */
'use strict';
const GAME_VERSION = '6.3';
const esc = s => String(s).replace(/[&<>"]/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));
const REDUCED = window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches;

/* ---------------- mission adapters ---------------- */
const MX = {
  storm: { key: 'storm', name: 'Storm Watch', orbit: 'GEO', eng: ENG, CH: CH, st: () => S.ops, design: () => S.design, sim: () => simulate(), dashFn: () => dash(), basePct: '35%',
    runFull: (d, dec, scn) => ENG.runFull(d, dec, 'v34', scn), pts: 'deliveredScience', cov: 'coveredPhases', target: 12,
    events: M => M.events.map(e => ({ h: e.t, msg: e.msg, type: e.type })), clock: h => fmtH(h),
    planScn: M => M.scn ? { anomalySolar: M.scn.anomalySolar, link: [], eclipseHour: null } : null, pctOf: p => p.anomalySolar,
    sci: (c, d) => d.collectedScience, sciUnit: 'science pts collected',
    gates: ['Delivered science ≥ 12', '≥ 3 storm phases covered', 'Critical update delivered', 'No critical failure'],
    fp: { 0: 1 }, screens: ['build', 'ops', 'report'] },
  fire: { key: 'fire', name: 'Wildfire Watch', orbit: 'LEO', eng: WF, CH: CHF, st: () => S.f, design: () => S.fdesign, sim: () => fsim(), dashFn: () => fDash(), basePct: '15%',
    runFull: (d, dec, scn) => WF.runFull(d, dec, scn), pts: 'deliveredScience', cov: 'coveredPasses', target: 3,
    events: M => M.events, clock: h => fmtH(h),
    planScn: M => M.scn ? { anomalySolar: M.scn.anomalySolar, contactCut: null, smoke: null } : null, pctOf: p => p.anomalySolar,
    sci: (c, d, ci, keys) => { const o = S.f, C = WC, P = c.P; const fpKey = ci === 3 ? keys[0] : ci === 0 ? keys[0] : o.choice[0][0]; const md = ci === 0 ? keys[1] : o.choice[0][1];
      const n = c.items.filter(i => i.kind === 'image' && i.t >= ci * 6 - 1e-9).length; const comp = (ci === 1 ? keys[1] : ci > 1 ? o.choice[1][1] : 'full') === 'compress' ? 0.75 : 1;
      return n * C.footprint[fpKey].regions.length * P.instrument.sens * C.mode[md].detect * C.footprint[fpKey].detect * comp; }, sciUnit: 'search index (regions × detection strength)',
    gates: ['Delivered science ≥ 3', 'New-hotspot alert within 2 h', 'Final update delivered', 'No critical failure'],
    fp: { 0: 0, 3: 0 }, screens: ['fbuild', 'fops', 'freport'] },
  flood: { key: 'flood', name: 'Flood Watch', orbit: 'LEO', eng: FL, CH: LCH, st: () => S.l, design: () => S.ldesign, sim: () => lsim(), dashFn: () => lDash(), basePct: '25%',
    runFull: (d, dec, scn) => FL.runFull(d, dec, 'v41', scn), pts: 'delivered', cov: 'coveredZones', target: 5,
    events: M => M.log, clock: h => `${fmtH(h)} (${lt(h)} local)`,
    planScn: M => M.scn ? { anomalyFactor: M.scn.anomalyFactor, contactCut: null } : null, pctOf: p => p.anomalyFactor,
    sci: (c, d) => d.collected, sciUnit: 'map pts collected',
    gates: ['Delivered maps ≥ 5', 'All 3 zones mapped', 'Fresh town update delivered', 'No critical failure'],
    fp: { 0: 1 }, screens: ['lbuild', 'lops', 'lreport'] },
};
const missionOfScreen = () => Object.keys(MX).find(k => MX[k].screens.includes(S.screen));
const curX = () => MX[missionOfScreen() || S.mission || 'storm'];

/* ---------------- shared state ---------------- */
S.scn = { storm: Scenario.generate('storm', 'PRACTICE'), fire: Scenario.generate('fire', 'PRACTICE'), flood: Scenario.generate('flood', 'PRACTICE') };
S.scnMode = { storm: 'practice', fire: 'practice', flood: 'practice' };
S.level = 'guided'; S.voice = true; S.chat = []; S.chatOpen = false; S.last = {}; S.live = null; S.jr = null;
function live(x) { return S.live ? Object.assign({}, x, S.live) : x; }
// challenge text with the seeded solar-fault level filled in (Challenge 3 only)
function chx(m, ci) { const X = MX[m], ch = X.CH[ci], scn = S.scn[m]; if (ci !== 2 || scn.practice) return ch;
  const pct = Math.round(X.pctOf(scn.params) * 100) + '%'; const rep = s => typeof s === 'string' ? s.split(X.basePct).join(pct) : s;
  return Object.assign({}, ch, { title: rep(ch.title), sub: rep(ch.sub), alert: rep(ch.alert), lesson: rep(ch.lesson) }); }
function faultPct(m) { const scn = S.scn[m]; return scn.practice ? MX[m].basePct : Math.round(MX[m].pctOf(scn.params) * 100) + '%'; }

/* ---------------- styles ---------------- */
document.head.insertAdjacentHTML('beforeend', `<style>
#crew{position:fixed;right:18px;bottom:18px;z-index:60;width:360px;max-width:calc(100vw - 24px);font-family:Poppins,system-ui,sans-serif}
#crew .dock{display:flex;align-items:flex-end;gap:10px;justify-content:flex-end}
#crew .pipbtn{width:76px;height:76px;border-radius:50%;border:1px solid #ffffff30;background:#0b1830e6;cursor:pointer;padding:6px;flex:none;position:relative}
#crew .pipbtn svg{width:100%;height:100%}
#crew .pipbtn.hop svg{animation:piphop .6s ease 2}
#crew .pipbtn .wing{transform-origin:18px 38px;animation:pipflap 1.4s ease-in-out infinite}
@keyframes piphop{0%,100%{transform:translateY(0)}50%{transform:translateY(-12px) rotate(-6deg)}}
@keyframes pipflap{0%,100%{transform:rotate(0)}50%{transform:rotate(-18deg)}}
#crew .bubble{background:#fff;color:#16213e;border-radius:16px 16px 4px 16px;padding:10px 14px;font-size:13px;line-height:1.45;max-width:260px;box-shadow:0 10px 30px #0008;cursor:pointer}
#crew .bubble b{display:block;font-size:12px;letter-spacing:.04em;color:#2f6fe8;margin-bottom:2px}
#crew .panel{background:#0b1220f2;border:1px solid #ffffff26;border-radius:18px;box-shadow:0 20px 60px #000a;margin-bottom:10px;overflow:hidden;backdrop-filter:blur(10px)}
#crew .phead{display:flex;align-items:center;gap:8px;padding:10px 12px;border-bottom:1px solid #ffffff1a;font-size:12px}
#crew .phead b{flex:1;font-size:13px;white-space:nowrap}
#crew .phead button,#crew .phead select{background:#ffffff14;border:1px solid #ffffff26;color:#fff;border-radius:8px;font-size:12px;padding:4px 8px;cursor:pointer;font-family:inherit}
#crew .phead select option{color:#000}
#crew .msgs{max-height:230px;overflow:auto;padding:10px 12px;display:flex;flex-direction:column;gap:8px}
#crew .msg{font-size:12.5px;line-height:1.5;background:#ffffff0f;border-radius:12px;padding:8px 10px;color:#e8eefc}
#crew .msg b.who{display:block;font-size:12px;letter-spacing:.05em;text-transform:uppercase;margin-bottom:2px}
#crew .msg.pip b.who{color:#7fb6ff}#crew .msg.sci b.who{color:#b99bff}#crew .msg.pow b.who{color:#ffcc66}#crew .msg.com b.who{color:#5fe0b0}
#crew .msg.you{background:#2f6fe833;align-self:flex-end}#crew .msg.sim{border:1px dashed #ffcc6699}
#crew .chips{display:flex;flex-wrap:wrap;gap:6px;padding:8px 12px;border-top:1px solid #ffffff1a}
#crew .chips button{background:#ffffff14;border:1px solid #ffffff2e;color:#fff;border-radius:999px;font-size:12px;padding:5px 10px;cursor:pointer;font-family:inherit}
#crew .chips button:hover{background:#ffffff26}
#crew .ask{display:flex;gap:6px;padding:8px 12px 12px}
#crew .ask input{flex:1;background:#ffffff10;border:1px solid #ffffff2e;border-radius:10px;color:#fff;padding:7px 10px;font-size:12.5px;font-family:inherit}
#crew .ask button{background:#2f6fe8;border:0;color:#fff;border-radius:10px;padding:0 12px;font-size:12px;cursor:pointer}
.pipfly{position:fixed;left:-80px;top:22vh;width:54px;height:54px;z-index:59;pointer-events:none;animation:pipfly 5s linear 1 forwards}
@keyframes pipfly{0%{transform:translate(0,0)}25%{transform:translate(30vw,-8vh)}50%{transform:translate(55vw,4vh)}75%{transform:translate(80vw,-6vh)}100%{transform:translate(110vw,0)}}
.scn-card{border:1px solid #ffffff22;border-radius:14px;padding:12px 14px;margin-top:14px;background:#ffffff08}
.scn-card h4{font-size:13px;font-weight:600;margin-bottom:8px}
.scn-row{display:flex;gap:6px;flex-wrap:wrap;align-items:center}
.scn-row button{background:#ffffff12;border:1px solid #ffffff2e;color:#fff;border-radius:10px;font-size:12px;padding:6px 10px;cursor:pointer;font-family:inherit}
.scn-row button.on{background:#2f6fe8;border-color:#2f6fe8}
.scn-row input{background:#ffffff10;border:1px solid #ffffff2e;border-radius:10px;color:#fff;padding:6px 10px;font-size:12px;width:130px;font-family:ui-monospace,monospace;text-transform:uppercase}
.scn-code{font-family:ui-monospace,monospace;font-size:15px;letter-spacing:.08em;background:#000a;border-radius:8px;padding:4px 10px}
.jrbar{height:8px;border-radius:6px;background:#ffffff1a;overflow:hidden;margin:12px 0}.jrbar i{display:block;height:100%;background:#5aa9ff;width:0}
.jrlog{height:150px;overflow:auto;font-size:12.5px;line-height:1.7;font-family:ui-monospace,monospace;background:#00000055;border-radius:12px;padding:10px 12px}
.jrlog .sim{color:#ffcc66}.jrlog .bad{color:#ff8a7a}.jrlog .ok{color:#7ee2a8}
.sat-ov{position:absolute;z-index:4;top:54px;width:46px;height:30px;pointer-events:none;transition:left .1s linear}
.sat-ov svg{width:100%;height:100%}
.sat-ov.geo{left:calc(50% - 23px)}
.sat-beam{position:absolute;left:50%;top:26px;width:2px;height:60px;background:linear-gradient(#ffe27a,#ffe27a00);transform:translateX(-50%);opacity:0}
.playing .sat-beam{opacity:1;animation:beam 1s ease-in-out infinite}
@keyframes beam{0%,100%{opacity:.3}50%{opacity:1}}
.simstate{position:absolute;right:12px;top:12px;z-index:5}
.scanbox.flash{box-shadow:0 0 0 4px #ffe27a88, inset 0 0 40px #ffe27a55}
.view.clickfp{cursor:pointer}
.predrow{display:flex;gap:8px;align-items:center;flex-wrap:wrap;margin-top:12px;font-size:12.5px;color:#cfd8ea}
.predrow button{background:#ffffff12;border:1px solid #ffffff2e;color:#fff;border-radius:999px;font-size:12px;padding:5px 12px;cursor:pointer;font-family:inherit}
.predrow button.on{background:#2f6fe8;border-color:#2f6fe8}
.xtab{width:100%;border-collapse:collapse;font-size:12.5px;margin-top:8px}.xtab td,.xtab th{padding:7px 8px;border-bottom:1px solid #ffffff14;text-align:left;vertical-align:top}
.xtab th{font-weight:600;color:#aab6cf;font-size:12px;text-transform:uppercase;letter-spacing:.04em}
.cls{display:inline-block;min-width:22px;text-align:center;border-radius:6px;font-size:12px;font-weight:700;padding:2px 6px;margin-right:6px}
.cls.A{background:#1f8a5b}.cls.B{background:#2f6fe8}.cls.C{background:#8a5cf0}.cls.D{background:#a8742a}
.srcwrap{max-height:62vh;overflow:auto;margin-top:10px}
.navbtn{background:#ffffff12;border:1px solid #ffffff2e;color:#fff;border-radius:999px;font-size:12px;padding:6px 12px;cursor:pointer;font-family:inherit;margin-left:8px}
@media (prefers-reduced-motion: reduce){#crew .pipbtn svg,#crew .pipbtn .wing,.pipfly,.playing .sat-beam{animation:none}}
@media (max-width:900px){#crew{width:300px}}
</style>`);
document.body.insertAdjacentHTML('beforeend', '<div id="crew" aria-live="polite"></div>');

/* ---------------- Pip the bird + crew chat ---------------- */
const PIP = `<svg viewBox="0 0 64 64" aria-hidden="true"><path class="wing" d="M13 36c-7-2-9 7-2 10 4 2 8-1 8-5z" fill="#3d8bff"/><path d="M51 36c7-2 9 7 2 10-4 2-8-1-8-5z" fill="#3d8bff"/><ellipse cx="32" cy="37" rx="20" ry="18" fill="#5aa9ff"/><ellipse cx="32" cy="43" rx="12" ry="10" fill="#e6f3ff"/><circle cx="25" cy="30" r="4.5" fill="#fff"/><circle cx="26" cy="30" r="2.2" fill="#0b1830"/><circle cx="39" cy="30" r="4.5" fill="#fff"/><circle cx="40" cy="30" r="2.2" fill="#0b1830"/><path d="M28.5 36h7l-3.5 5z" fill="#ffb648"/><path d="M20 22q12-13 24 0" stroke="#e6f3ff" stroke-width="2.4" fill="none" stroke-linecap="round"/><rect x="16" y="22" width="6" height="9" rx="3" fill="#e6f3ff"/><path d="M19 31q2 8 9 8" stroke="#e6f3ff" stroke-width="1.6" fill="none"/><path d="M26 55v4M38 55v4" stroke="#ffb648" stroke-width="2.6" stroke-linecap="round"/></svg>`;
const WHO = { pip: ['Pip · mission guide', 'pip', 1.35, 1.05], sci: ['Dr. Maya · Science Lead', 'sci', 1.15, 1], pow: ['Alex · Power Engineer', 'pow', 0.85, 0.98], com: ['Sam · Communications', 'com', 1.0, 1.05], you: ['You', 'you', 1, 1], sim: ['Simulated event', 'sim', 1.2, 1] };
function speak(who, text) { if (!S.voice || !('speechSynthesis' in window)) return; try { const u = new SpeechSynthesisUtterance(text.replace(/<[^>]+>/g, '')); u.pitch = WHO[who][2]; u.rate = WHO[who][3]; u.lang = 'en-US'; speechSynthesis.speak(u); } catch (e) { /* voice is optional */ } }
function say(who, html, opts) { S.chat.push({ who, html }); if (S.chat.length > 60) S.chat.shift(); if (!opts || opts.speak !== false) speak(who, html); if (opts && opts.open) S.chatOpen = true; renderCrew(true); }
function renderCrew(isNew) {
  const el = document.getElementById('crew'); const m = missionOfScreen();
  if (!m) { el.innerHTML = ''; return; }
  const last = S.chat[S.chat.length - 1];
  const chips = quickChips(m).map(c => `<button data-a="q" data-q="${c[0]}">${c[1]}</button>`).join('');
  const panel = S.chatOpen ? `<div class="panel"><div class="phead"><b>Crew chat</b>
      <select data-a="level" aria-label="Guidance level"><option value="guided" ${S.level === 'guided' ? 'selected' : ''}>Guided</option><option value="standard" ${S.level === 'standard' ? 'selected' : ''}>Standard</option><option value="expert" ${S.level === 'expert' ? 'selected' : ''}>Expert</option></select>
      <button data-a="voice" aria-pressed="${S.voice}">${S.voice ? '🔊 Voice on' : '🔇 Muted'}</button><button data-a="chatToggle" aria-label="Minimise chat">–</button></div>
     <div class="msgs" id="crewMsgs">${S.chat.map(c => `<div class="msg ${WHO[c.who][1]}"><b class="who">${WHO[c.who][0]}</b>${c.html}</div>`).join('') || '<div class="msg pip"><b class="who">Pip</b>Hi! I\'m Pip. Ask me anything about your mission.</div>'}</div>
     <div class="chips">${chips}</div>
     <form class="ask" id="askForm"><input id="askIn" placeholder="Ask Mission Control…" aria-label="Ask Mission Control"><button type="submit">Send</button></form></div>` : '';
  el.innerHTML = `${panel}<div class="dock">${!S.chatOpen && last ? `<div class="bubble" data-a="chatToggle"><b>${WHO[last.who][0]}</b>${last.html.length > 170 ? last.html.replace(/<[^>]+>/g, '').slice(0, 165) + '…' : last.html}</div>` : ''}
    <button class="pipbtn ${isNew ? 'hop' : ''}" data-a="chatToggle" aria-label="Open Mission Control chat">${PIP}</button></div>`;
  const ms = document.getElementById('crewMsgs'); if (ms) ms.scrollTop = ms.scrollHeight;
  const f = document.getElementById('askForm'); if (f) f.onsubmit = e => { e.preventDefault(); const v = document.getElementById('askIn').value.trim(); if (v) { say('you', esc(v), { speak: false }); answer(v); } };
}
function pipFly() { if (REDUCED) return; const d = document.createElement('div'); d.className = 'pipfly'; d.innerHTML = PIP; document.body.appendChild(d); setTimeout(() => d.remove(), 5200); }

/* ---------------- crew advice: engine look-ahead on a cloned mission state ---------------- */
function forecast(m) { const X = MX[m], st = X.st(), ci = st.ci, M = st.M, g = X.CH[ci].groups, out = [];
  for (const a of g[0].opts) for (const b of g[1].opts) { const c = structuredClone(M); c.traceOn = false; c.trace = []; c.scn = X.planScn(M, ci);
    X.eng.runChallenge(c, ci, [a[0], b[0]]); const d = X.eng.derive(c);
    out.push({ keys: [a[0], b[0]], label: `${a[1]} + ${b[1]}`, batt: d.batteryPct, deliv: d[X.pts], sci: X.sci(c, d, ci, [a[0], b[0]]), stor: d.storagePct, health: d.health }); }
  return out; }
function crewAdvice(m) { const X = MX[m], st = X.st(), f = forecast(m); st.fc = f;
  const best = (key, tie) => f.slice().sort((a, b) => b[key] - a[key] || tie(a, b))[0];
  const spread = key => Math.max(...f.map(x => x[key])) - Math.min(...f.map(x => x[key]));
  const sci = best('sci', (a, b) => b.deliv - a.deliv), pow = f.slice().sort((a, b) => b.health - a.health || b.batt - a.batt)[0], com = best('deliv', (a, b) => a.stor - b.stor);
  const n1 = x => (Math.round(x * 10) / 10).toString();
  const line = (who, pick, flat, guided, plain, prio) => { if (S.level === 'expert') return say(who, prio, { speak: true });
    if (flat) return say(who, `${prio} For the next 6 hours every option looks the same to me.`);
    say(who, `I'd pick <b>${pick.label}</b>. ${S.level === 'guided' ? guided : plain}`); };
  line('sci', sci, spread('sci') < 0.05, `Plan forecast: ${n1(sci.sci)} ${X.sciUnit}, the most of the four options.`, 'It gives us the best observations.', 'My priority is the science: enough good observations of the right places.');
  line('pow', pow, spread('batt') < 1, `Plan forecast: battery ends near ${Math.round(pow.batt)}%${pow.health < 100 ? '' : ', health stays 100%'}. The lowest option ends near ${Math.round(Math.min(...f.map(x => x.batt)))}%.`, 'It keeps the most energy in the battery.', 'My priority is keeping the spacecraft alive: battery and health.');
  line('com', com, spread('deliv') < 0.05, `Plan forecast: ${n1(com.deliv)} useful points on the ground after this challenge, storage near ${Math.round(com.stor)}%.`, 'It gets the most useful data to the ground.', 'My priority is delivery: data only counts once it reaches Earth.');
  const agree = sci.label === pow.label && pow.label === com.label;
  say('pip', S.level === 'expert' ? 'You\'re the Flight Director. Decide, then predict what the battery will do.' : agree ? 'The crew agrees this time. You\'re still the Flight Director: your call!' : 'They don\'t agree, and each has a good reason. You\'re the Flight Director: which risk will you accept? <span style="opacity:.7">(Forecasts assume nothing unexpected happens.)</span>', { open: true }); }

/* ---------------- deterministic assistant ---------------- */
function quickChips(m) { const X = MX[m], st = X.st && X.st(); const onOps = S.screen === X.screens[1];
  const c = []; if (onOps && st && st.phase === 'choose') c.push(['advice', 'What would the crew do?']); if (onOps && st && st.phase === 'result') c.push(['why', 'Why did that happen?']);
  if (onOps) c.push(['status', 'Are we on track?']); c.push(['kw', 'kW vs kWh?'], ['orbit', X.orbit === 'GEO' ? 'Why doesn\'t it move?' : 'Why only short passes?'], ['code', 'What is a Mission Code?'], ['sources', 'Where do the numbers come from?']); return c; }
function answer(q) { const m = missionOfScreen() || 'storm', X = MX[m], st = X.st && X.st(); const t = q.toLowerCase(); const has = (...w) => w.some(x => t.includes(x));
  if (t === 'advice' || has('recommend', 'what would', 'should i', 'advice')) { if (st && st.phase === 'choose') return crewAdvice(m); return say('pip', 'Crew advice is available while a challenge decision is open.'); }
  if (t === 'why' || has('why did', 'what happened', 'explain result')) { if (st && st.log[st.ci]) { const L = st.log[st.ci]; return say('pip', `${L.good} <br>The cost: ${L.trade}`); } return say('pip', 'Run a challenge first, then I can explain the result from the mission log.'); }
  if (t === 'status' || has('on track', 'status', 'winning', 'score', 'succeed')) { if (!st) return say('pip', 'Launch first!'); const s = X.eng.score(st.M), g = s.gates; const names = X.gates;
    return say('pip', `Requirements so far: ${['G1', 'G2', 'G3', 'G4'].map((k, i) => `${g[k] ? '✅' : '⬜'} ${names[i]}`).join(' · ')}. Useful data delivered: ${fmt(s.derived[X.pts])} / ${X.target}. Requirements are checked at hour 24, so an empty box can still be filled.`); }
  if (t === 'kw' || has('kwh', 'kw ', 'power', 'energy', 'battery')) { const P = st ? st.M.P.power : null; return say('pip', `kW is how fast energy flows, like litres per minute from a tap. kWh is how much energy is stored, like litres in a bucket. ${P ? `Your battery holds ${P.battKWh} kWh and your arrays make up to ${P.solarKW} kW in sunlight.` : ''} A 2 kW load running for 3 hours uses 2 × 3 = 6 kWh.`); }
  if (t === 'orbit' || has('orbit', 'geo', 'leo', 'pass', 'move')) return say('pip', X.orbit === 'GEO' ? 'Your satellite is in geostationary orbit, 35,786 km up. It circles Earth once a day, exactly as fast as Earth turns, so it seems to hang over one spot and can watch the storm all the time.' : 'Your satellite is in low Earth orbit and circles Earth about every 100 minutes. It only sees the target when its path crosses it, and only talks to the ground when it passes a station. That is why passes and contacts are short.');
  if (t === 'code' || has('mission code', 'seed', 'classroom', 'surprise')) return say('pip', `Your code is <b>${S.scn[m].code}</b>. A Mission Code fixes the outside conditions of a mission (for example how bad the solar fault is, or when a ground station has trouble). Everyone who enters the same code faces the same conditions, so you can compare strategies fairly. These events are simulated for learning; they are not NASA observations.`);
  if (t === 'sources' || has('source', 'real', 'nasa', 'where do', 'true')) { openSources(m); return say('pip', 'I opened the Data & sources panel. Blue B = published by NASA/NOAA, purple C = calculated from a formula, brown D = a game value we chose for teaching.', { speak: true }); }
  if (has('storage', 'full', 'gb')) return say('pip', 'Storage only holds data between downlinks. If you collect faster than you can send, it fills up and new observations are lost or rejected. Smaller files or a faster link both help.');
  if (has('safe mode', 'safe')) return say('pip', 'Safe mode is the spacecraft protecting itself: it switches off science and sending to save the battery. It keeps the mission alive, but no science happens while it lasts.');
  if (has('downlink', 'contact', 'send', 'deliver')) return say('pip', 'Data only helps people once it reaches the ground. What you can send is limited by rate × contact time. A 1 GB file on a 0.6 GB/hour link needs 1 ÷ 0.6 ≈ 1.7 hours of contact.');
  say('pip', 'I can answer from your mission data about: the crew\'s advice, why a result happened, whether you\'re on track, kW vs kWh, your orbit, storage, safe mode, downlink, Mission Codes and data sources.'); }

/* ---------------- Mission Codes UI ---------------- */
function scenarioCard(m) { const scn = S.scn[m], mode = S.scnMode[m];
  return `<div class="scn-card"><h4>Mission scenario</h4>
   <div class="scn-row"><button class="${mode === 'practice' ? 'on' : ''}" data-a="scnPractice" data-m="${m}">Practice</button><button class="${mode === 'surprise' ? 'on' : ''}" data-a="scnSurprise" data-m="${m}">Surprise mission</button>
    <input id="scnIn-${m}" placeholder="${Scenario.PREFIX[m]}-XXXXX" aria-label="Mission code"><button class="${mode === 'class' ? 'on' : ''}" data-a="scnEnter" data-m="${m}">Use class code</button></div>
   <div class="scn-row" style="margin-top:10px"><span class="muted" style="font-size:12px">Mission Code</span><span class="scn-code">${scn.code}</span><button data-a="scnCopy" data-m="${m}">Copy</button></div>
   <p class="muted" style="font-size:12px;margin-top:8px">${scn.practice ? 'Practice uses the standard conditions with no surprises.' : `This code sets ${scn.events.length} simulated event${scn.events.length > 1 ? 's' : ''} that you will discover during the mission. Same code = same conditions for everyone.`} Simulated events are for learning and are never NASA data.</p></div>`; }

/* ---------------- Mission Readiness Review ---------------- */
function mrr(m) { const X = MX[m], d = X.design(); let rows = [], kg, cost, lim;
  const row = (seg, item, val, ok, note) => rows.push(`<tr><td>${seg}</td><td>${item}</td><td><b>${val}</b></td><td style="color:${ok ? 'var(--good)' : 'var(--warn)'}">${ok ? 'Ready' : 'Watch'}</td><td class="muted">${note}</td></tr>`);
  if (m === 'storm') { const P = k => CFG.parts[k][d[k]], t = totals(); const gen = P('observation').maxPerHour * 6 * P('instrument').sizeGB, cap = P('comms').rateGBh * CFG.backgroundDownlink * 6, f = S.scn.storm.practice ? CFG.anomalySolarFactor : null;
    row('Launch', 'Mass and budget', `${t.kg.toLocaleString()} kg · $${t.m}M`, true, `Limits ${MAX_KG.toLocaleString()} kg (GOES-R launch mass) · $${MAX_M}M`);
    row('Space', 'Data made vs sent per 6 h (high-res, max cadence)', `${fmt(gen)} GB vs ${fmt(cap)} GB`, gen <= cap + 1e-9, 'If you make more than you can send, storage fills and data arrives late');
    row('Space', 'Storage fills after', gen > cap ? `${fmt(P('storage').capGB / ((gen - cap) / 6))} h` : 'never at this rate', gen <= cap || P('storage').capGB / ((gen - cap) / 6) >= 12, `${P('storage').capGB} GB on board`);
    row('Space', 'Battery alone powers essentials for', `${fmt(P('power').battKWh / CFG.essentialKW)} h`, P('power').battKWh / CFG.essentialKW >= 4, `${P('power').battKWh} kWh ÷ ${CFG.essentialKW} kW essential load`);
    row('Space', 'Net power during a 35% solar fault', `${fmt(P('power').solarKW * CFG.anomalySolarFactor - CFG.essentialKW)} kW`, P('power').solarKW * CFG.anomalySolarFactor - CFG.essentialKW >= -0.8, 'Negative means the battery drains even before imaging');
    row('Ground', 'Full-rate downlink (final challenge)', `${P('comms').rateGBh} GB/h`, true, 'Background link uses 50% of this in challenges 1–3');
    row('User', 'Forecasters need', '12 science pts, 3 of 4 storm phases, a fresh final update', true, 'Checked at hour 24');
  } else if (m === 'fire') { const P = k => WC.parts[k][d[k]], t = fTotals(); const perPass = P('observation').perPass * P('instrument').sizeGB, perC = P('comms').rateGBh * 1;
    row('Launch', 'Mass and budget', `${t.kg} kg · ${t.cr} credits`, true, `Limits ${WC.limits.kg} kg · ${WC.limits.credits} credits`);
    row('Space', 'Data per pass vs one contact (high detail)', `${fmt(perPass)} GB vs ${fmt(perC)} GB`, perPass <= perC + 1e-9, 'If a pass makes more than one contact can send, images arrive a contact late');
    row('Space', 'Detection strength (wide survey, high detail)', (P('instrument').sens * WC.mode.high.detect * WC.footprint.wide.detect).toFixed(2), P('instrument').sens * WC.mode.high.detect * WC.footprint.wide.detect >= 0.8, 'Strong fires need 0.5, moderate 0.8, weak 1.2');
    row('Space', 'Eclipse drain per orbit', `${fmt(WC.baselineKW * 0.5)} kWh of ${P('power').battKWh} kWh`, true, '30 minutes in Earth\'s shadow every 100-minute orbit');
    row('Space', 'Net power in sunlight during a 15% solar fault', `${fmt(P('power').solarKW * WC.anomaly.solarFactor - WC.baselineKW)} kW`, P('power').solarKW * WC.anomaly.solarFactor - WC.baselineKW >= -0.5, 'Negative: the battery drains through the whole fault');
    row('Ground', 'Contacts', '5 one-hour contacts in 24 h', true, 'Alerts are tiny (0.01 GB); images are not');
    row('User', 'Responders need', '3 science pts, new-hotspot alert within 2 h, a fresh final image', true, 'Checked at hour 24');
  } else { const P = k => LC.parts[k][d[k]], t = lTotals(); const perPass = P('observation').perPass * P('instrument').sizeGB, perC = P('comms').rateGBmin * LC.contactMin, radar = P('instrument').kind === 'radar';
    const net = P('power').solarKW * LC.sunFactor * LC.anomaly.factor - LC.essentialKW - LC.standbyKW;
    row('Launch', 'Mass and budget', `${t.kg.toLocaleString()} kg · $${t.m}M`, true, `Limits ${LC.limits.kg.toLocaleString()} kg (NISAR launch mass) · $${LC.limits.costM}M`);
    row('Space', 'Passes your instrument can use', radar ? '8 of 8 (day, night, cloud)' : '3 clear daytime passes of 8', radar, radar ? 'Radar maps hills and towns less clearly' : 'A camera needs sunlight and gaps in the cloud');
    row('Space', 'Data per pass vs one contact (high detail, raw)', `${fmt(perPass)} GB vs ${fmt(perC)} GB`, perPass <= perC + 1e-9, 'Maps that do not fit wait for the next contact, 3 hours later');
    row('Space', 'Storage holds', `${fmt(P('storage').capGB / perPass)} passes of raw maps`, P('storage').capGB / perPass >= 2, `${P('storage').capGB} GB on board`);
    row('Space', 'Net power during a 25% solar fault (normal ops)', `${fmt(net)} kW`, net >= -0.8, `Battery ${P('power').battKWh} kWh lasts ${fmt(P('power').battKWh * 0.9 / Math.max(0.01, -net))} h before safe mode`);
    row('Ground', 'Contacts', '8 ten-minute contacts in 24 h', true, 'A relay satellite can add two windows in the final challenge');
    row('User', 'Responders need', '5 map pts, all 3 zones, a fresh town map', true, 'Checked at hour 24');
  }
  $('#layer').innerHTML = `<div class="modal-wrap"><div class="glass modal" style="max-width:860px;width:92vw"><div class="eyebrow">Mission Readiness Review · ${X.name}</div>
    <h2>Go / no-go for launch</h2><p class="muted" style="font-size:13px">Real missions hold a readiness review before launch. These checks are calculated from your design. "Watch" items will not stop the launch, but plan around them.</p>
    <div style="overflow:auto"><table class="xtab"><tr><th>Segment</th><th>Check</th><th>Your design</th><th>Status</th><th>Why it matters</th></tr>${rows.join('')}</table></div>
    <p class="muted" style="font-size:12px;margin-top:10px">Segments follow NASA's "Design and Develop Science Missions": Launch, Space, Ground, User. Mission Code: <b>${S.scn[m].code}</b>.</p>
    <div class="acts"><button class="btn ghost" data-a="mrrBack">Back to design</button><button class="btn good" data-a="goLaunch" data-m="${m}">Go for launch 🚀</button></div></div></div>`; }

/* ---------------- live mission journey ---------------- */
const SATSVG = `<svg viewBox="0 0 46 30"><rect x="0" y="9" width="14" height="12" fill="#3d8bff" stroke="#bcd7ff"/><rect x="32" y="9" width="14" height="12" fill="#3d8bff" stroke="#bcd7ff"/><rect x="16" y="6" width="14" height="18" rx="2" fill="#e8eefc"/><circle cx="23" cy="15" r="3.5" fill="#0b1830"/></svg>`;
function satOverlay() { const m = missionOfScreen(), X = MX[m], st = X.st(), playing = st.phase === 'playing';
  const label = playing ? '▶ Mission running' : st.phase === 'result' ? '✓ Challenge complete' : '⏸ Simulation paused · decision required';
  return `<div class="simstate"><span class="chip ${playing ? 'good' : 'warn'}">${label}</span> <span class="chip">${S.scn[m].code}</span></div>
   <div class="sat-ov ${X.orbit === 'GEO' ? 'geo' : 'leo'}" id="satOv" style="${X.orbit === 'GEO' ? '' : 'left:8%'}" title="${X.orbit === 'GEO' ? 'Geostationary: stays over the storm' : 'Low Earth orbit: keeps moving (path shown is an illustration)'}">${SATSVG}<div class="sat-beam"></div></div>`; }
function fpAttr() { const m = missionOfScreen(), X = MX[m], st = X.st(); return (st.phase === 'choose' && X.fp[st.ci] !== undefined) ? 'data-a="toggleFp" title="Click the map to switch footprint"' : ''; }
function predChips() { const m = missionOfScreen(), st = MX[m].st(); const p = (st.pred || {})[st.ci];
  return `<div class="predrow"><span>Your prediction: after these 6 hours the battery will be</span>${[['up', 'higher'], ['same', 'about the same'], ['down', 'lower']].map(o => `<button class="${p === o[0] ? 'on' : ''}" data-a="pred" data-v="${o[0]}">${o[1]}</button>`).join('')}</div>`; }
function journeyPanel() { const m = missionOfScreen(), X = MX[m], st = X.st(), j = S.jr || {};
  return `<div class="glass decision ${'playing'}"><div class="dhead"><div class="ic">▶</div><div><h3>Mission running</h3><p>Mission time <b id="jrClock" style="color:#fff">${X.clock(st.ci * 6)}</b> · live telemetry from the simulation</p></div></div>
   <div class="jrbar"><i id="jrProg"></i></div><div class="jrlog" id="jrLog" role="log"></div>
   <div class="dfoot"><div class="pred">You are watching results the simulation has already calculated. Playback speed never changes the numbers.</div>
   <div style="display:flex;gap:8px"><button class="btn ghost" data-a="jrSpeed">${j.speed === 3 ? '1× speed' : '3× speed'}</button><button class="btn primary" data-a="jrSkip">Skip</button></div></div></div>`; }
function runWithJourney(m) { const X = MX[m], st = X.st(), M = st.M, ci = st.ci; const n0 = M.trace.length, e0 = X.events(M).length; const before = X.eng.derive(M);
  X.sim();
  const frames = M.trace.slice(n0), evs = X.events(M).slice(e0).map(e => ({ h: e.h, msg: e.msg, cls: /fail|unpowered|Safe mode entered|rejected|skipped|deferred/i.test(e.msg) ? 'bad' : /deliver/i.test(e.msg) ? 'ok' : '' }));
  S.scn[m].events.filter(e => e.from >= ci * 6 && e.from < ci * 6 + 6).forEach(e => evs.push({ h: e.from, msg: `SIMULATED EVENT · ${e.title}: ${e.text}`, cls: 'sim', sim: e }));
  evs.sort((a, b) => a.h - b.h);
  st.pendingDelta = st.delta; st.delta = {}; st.phase = 'playing'; st.before = before;
  S.jr = { m, h0: ci * 6, t: ci * 6, frames, evs, shown: 0, speed: 1, timer: null, logHtml: '' };
  S.chatOpen = false; S.live = { t: ci * 6 }; render(); pipFly();
  if (REDUCED) return endJourney();
  S.jr.timer = setInterval(tickJourney, 100); }
function tickJourney() { const j = S.jr; if (!j) return; const X = MX[j.m], st = X.st(); j.t = Math.min(j.h0 + 6, j.t + 0.1 * j.speed);
  let fr = null; for (const f of j.frames) if (f.t <= j.t + 1e-9) fr = f; if (fr) { S.live = Object.assign({}, fr, { t: j.t }); if (j.m === 'fire') { S.live.critStatus = '…'; S.live.finalStatus = '…'; } } else S.live = { t: j.t };
  const side = document.querySelector('.ops .side'); if (side) side.outerHTML = X.dashFn();
  while (j.shown < j.evs.length && j.evs[j.shown].h <= j.t + 1e-9) { const e = j.evs[j.shown++]; j.logHtml += `<div class="${e.cls}">${X.clock(e.h).slice(0, 5)}  ${esc(e.msg)}</div>`;
    if (/captur/i.test(e.msg)) { _render(); renderCrew(false); const sb = document.querySelector('.scanbox'); if (sb) { sb.classList.add('flash'); setTimeout(() => sb.classList.remove('flash'), 350); } } }
  const log = document.getElementById('jrLog'); if (log && log.dataset.n !== String(j.shown)) { log.innerHTML = j.logHtml; log.dataset.n = String(j.shown); log.scrollTop = log.scrollHeight; }
  const c = document.getElementById('jrClock'); if (c) c.textContent = X.clock(j.t); const p = document.getElementById('jrProg'); if (p) p.style.width = ((j.t - j.h0) / 6 * 100) + '%';
  const sat = document.getElementById('satOv'); if (sat && X.orbit === 'LEO') sat.style.left = (((j.t * 60) % 100) / 100 * 110 - 8) + '%';
  if (j.t >= j.h0 + 6 - 1e-9) endJourney(); }
function endJourney() { const j = S.jr; if (!j) return; clearInterval(j.timer); const X = MX[j.m], st = X.st(), ci = st.ci; S.live = null; S.jr = null;
  st.delta = st.pendingDelta || {}; st.phase = 'result'; render();
  const after = X.eng.derive(st.M), db = after.batteryPct - st.before.batteryPct; const actual = db > 5 ? 'up' : db < -5 ? 'down' : 'same'; const word = { up: 'higher', same: 'about the same', down: 'lower' };
  j.evs.filter(e => e.sim).forEach(e => say('sim', `<b>${e.sim.title}.</b> ${e.sim.text} This was a simulated event from your Mission Code, not real data.`, { speak: false }));
  const p = (st.pred || {})[ci]; let msg = p ? `You predicted the battery would end ${word[p]}. It went ${Math.round(st.before.batteryPct)}% → ${Math.round(after.batteryPct)}%: ${p === actual ? 'good call! ✅' : `it actually ended ${word[actual]}. Worth asking why.`}` : `Battery ${Math.round(st.before.batteryPct)}% → ${Math.round(after.batteryPct)}%. Next time, try predicting before you run.`;
  const fc = (st.fc || []).find(f => f.keys.join() === st.choice[ci].join()); if (fc && (Math.abs(fc.deliv - after[X.pts]) > 0.3 || Math.abs(fc.batt - after.batteryPct) > 6)) msg += ` The crew's plan forecast for your choice was ${fmt(fc.deliv)} points delivered and ${Math.round(fc.batt)}% battery; reality was ${fmt(after[X.pts])} and ${Math.round(after.batteryPct)}%. Something unplanned changed the outcome.`;
  say('pip', msg); }

/* ---------------- final report extras ---------------- */
function designLabel(m) { const X = MX[m], d = X.design(); return Object.keys(d).map(k => `${k}: ${d[k] === 'adv' ? (m === 'flood' ? 'B' : 'Advanced') : (m === 'flood' ? 'A' : 'Standard')}`).join(' · '); }
function reportExtras(m) { const X = MX[m], st = X.st(), M = st.M, scn = S.scn[m], d = Object.assign({}, X.design()), dec = st.choice.map(c => c.slice()); const sc = X.eng.score(M);
  if (!st.recorded) { st.recorded = true; st.prev = S.last[m] || null;
    st.record = { game: 'Earth Missions', gameVersion: GAME_VERSION, mission: m, missionCode: scn.code, scenarioId: scn.id, scenarioVersion: Scenario.VERSION, engineVersion: X.eng.VERSION, mode: S.scnMode[m], design: d, decisions: dec, manipulations: M.ext ? JSON.parse(JSON.stringify(M.ext)) : null,
      result: { score: sc.total, outcome: sc.outcome, science: +sc.sci.toFixed(2), delivery: +sc.del.toFixed(2), efficiency: +sc.eff.toFixed(2), reliability: +sc.rel.toFixed(2), gates: sc.gates }, simulatedEvents: scn.events.map(e => e.text) };
    S.last[m] = st.record;
    const fails = ['G1', 'G2', 'G3', 'G4'].filter(k => !sc.gates[k]).map((k) => X.gates[+k[1] - 1]);
    setTimeout(() => say('pip', sc.outcome === 'Mission Success' ? `Mission Success with ${sc.total} points! Scroll down to "Change one decision" and see which choice mattered most.` : `${sc.outcome}, ${sc.total} points. Missed: ${fails.join('; ') || 'too little delivered science'}. The "Change one decision" table below shows which single choice would have changed the result.`), 400); }
  // what-if: flip exactly one control, same design, same Mission Code
  const rows = []; let bestGain = null;
  X.CH.forEach((ch, ci) => ch.groups.forEach((g, gi) => { const alt = g.opts.find(o => o[0] !== dec[ci][gi]); const d2 = dec.map(c => c.slice()); d2[ci][gi] = alt[0]; const r = X.runFull(d, d2, scn).s; const dv = r.total - sc.total;
    if (!bestGain || dv > bestGain.dv) bestGain = { dv, ci, lab: alt[1], out: r.outcome };
    rows.push(`<tr><td>C${ci + 1} · ${g.lab}</td><td>${g.opts.find(o => o[0] === dec[ci][gi])[1]} → <b>${alt[1]}</b></td><td><b>${r.total}</b> <span class="d ${dv > 0 ? 'up' : dv < 0 ? 'down' : 'zero'}">${dv > 0 ? '+' : ''}${dv}</span></td><td style="color:${r.outcome === 'Mission Success' ? 'var(--good)' : r.outcome === 'Mission Failure' ? 'var(--bad)' : 'var(--warn)'}">${r.outcome}${r.outcome !== sc.outcome ? ' ⬅ changes outcome' : ''}</td></tr>`); }));
  // cause-and-effect timeline
  const key = X.events(M).filter(e => /fail|unpowered|Safe mode|rejected|skipped|screened|Evicted|Critical|Alert delivered/i.test(e.msg)).slice(0, 10).map(e => ({ h: e.h, msg: e.msg }));
  scn.events.forEach(e => key.push({ h: e.from, msg: `Simulated event · ${e.title}: ${e.text}`, sim: true })); dec.forEach((c, ci) => key.push({ h: ci * 6, msg: `Decision ${ci + 1}: ${st.log[ci] ? st.log[ci].choices : c.join(' + ')}`, dec: true }));
  key.sort((a, b) => a.h - b.h);
  const prev = st.prev; const cmp = prev ? `<div class="glass panel" style="margin-top:16px"><h2 style="font-size:26px;margin-bottom:8px">Compared with your last attempt</h2>
    <table class="xtab"><tr><th></th><th>Last attempt</th><th>This attempt</th></tr>
    <tr><td>Mission Code</td><td>${prev.missionCode}</td><td>${scn.code}${prev.missionCode !== scn.code ? ' <span class="muted">(different conditions)</span>' : ''}</td></tr>
    <tr><td>Score · outcome</td><td>${prev.result.score} · ${prev.result.outcome}</td><td><b>${sc.total}</b> · ${sc.outcome}</td></tr>
    <tr><td>Design changes</td><td colspan="2">${Object.keys(d).filter(k => prev.design[k] !== d[k]).map(k => `${k}: ${prev.design[k]} → ${d[k]}`).join(' · ') || 'none'}</td></tr>
    <tr><td>Decision changes</td><td colspan="2">${dec.map((c, ci) => c.map((v, gi) => prev.decisions[ci][gi] !== v ? `C${ci + 1} ${X.CH[ci].groups[gi].lab}: ${prev.decisions[ci][gi]} → ${v}` : '').filter(Boolean).join(' · ')).filter(Boolean).join(' · ') || 'none'}</td></tr></table>
    <p class="muted" style="font-size:12px;margin-top:8px">If several things changed at once, you cannot tell which one caused the difference. Change one thing at a time to test an idea.</p></div>` : '';
  const real = Prov.REAL[m];
  return `<div class="glass panel" style="margin-top:16px"><h2 style="font-size:26px;margin-bottom:6px">Change one decision</h2>
    <p class="muted" style="font-size:12.5px">Each row replays the whole mission with the same satellite and the same Mission Code, changing only one choice.${bestGain && bestGain.dv > 0 ? ` Biggest gain: Challenge ${bestGain.ci + 1} → ${bestGain.lab} (${bestGain.dv > 0 ? '+' : ''}${bestGain.dv}).` : ' No single change would have scored higher.'}</p>
    <table class="xtab"><tr><th>Decision</th><th>Change</th><th>Score</th><th>Outcome</th></tr>${rows.join('')}</table></div>
   <div class="glass panel" style="margin-top:16px"><h2 style="font-size:26px;margin-bottom:8px">Cause-and-effect timeline</h2>
    ${key.map(e => `<div class="kv"><span>${X.clock(e.h).slice(0, 5)}</span><b style="font-weight:${e.dec ? 600 : 400};color:${e.sim ? '#ffcc66' : e.dec ? '#fff' : '#cfd8ea'};text-align:right;max-width:80%">${esc(e.msg)}</b></div>`).join('')}</div>
   ${cmp}
   ${realDataCard(m)}
   <div class="glass panel" style="margin-top:16px"><h2 style="font-size:26px;margin-bottom:8px">A real mission like yours</h2><p><b>${real.name}</b></p><ul class="muted" style="line-height:1.7;padding-left:18px;margin-top:6px">${real.facts.map(f => `<li>${f}</li>`).join('')}</ul>
    <p style="margin-top:8px"><a href="${real.url}" style="color:#7fb6ff">Read the official page</a> · <button class="navbtn" data-a="sources">All data & sources</button></p></div>
   <div class="glass panel" style="margin-top:16px"><h2 style="font-size:26px;margin-bottom:8px">Mission record</h2>
    <div class="kv"><span>Mission Code</span><b class="scn-code">${scn.code}</b></div><div class="kv"><span>Engine · scenario version</span><b>${X.eng.VERSION} · ${Scenario.VERSION}</b></div><div class="kv"><span>Design</span><b style="text-align:right;max-width:75%">${designLabel(m)}</b></div>
    ${scn.events.length ? `<p class="muted" style="font-size:12px;margin-top:8px"><b style="color:#ffcc66">Simulated events in this code (not NASA data):</b> ${scn.events.map(e => e.text).join(' ')}</p>` : '<p class="muted" style="font-size:12px;margin-top:8px">Practice conditions: no simulated surprise events.</p>'}
    <p style="margin-top:10px"><button class="navbtn" style="margin:0" data-a="copyRecord" data-m="${m}">Copy mission record</button> <span class="muted" style="font-size:12px">Share it with classmates who flew ${scn.code} and compare strategies.</span></p>
    <textarea id="rec-${m}" readonly style="width:100%;height:70px;margin-top:8px;background:#0006;color:#cfd8ea;border:1px solid #ffffff22;border-radius:10px;font-size:12px;font-family:ui-monospace,monospace;padding:8px">${esc(JSON.stringify(st.record))}</textarea></div>`; }

/* ---------------- real NASA observations (class A, display only) ---------------- */
function rainColor(v) { return v < 0.1 ? null : v < 1 ? '#1d4e89' : v < 2.5 ? '#2a7fbf' : v < 5 ? '#3fb68b' : v < 10 ? '#e6d44a' : v < 20 ? '#f08a2c' : '#e0413a'; }
function realDataCard(m) { if (typeof NasaData === 'undefined') return ''; const N = NasaData; let body = '';
  const tag = '<span style="background:#1f6f43;color:#fff;border-radius:6px;padding:2px 8px;font-size:12px;font-weight:600;letter-spacing:.04em">REAL NASA OBSERVATIONS</span>';
  if (m === 'storm') { const I = N.imerg, g = I.grid, c = 5; let r = '';
    for (let x = 0; x < g.nx; x++) for (let y = 0; y < g.ny; y++) { const col = rainColor(g.v[x][y]); if (col) r += `<rect x="${x * c}" y="${(g.ny - 1 - y) * c}" width="${c}" height="${c}" fill="${col}"/>`; }
    body = `<p><b>Rainfall seen from space, ${I.window}</b> · ${I.product}</p>
    <div style="display:flex;gap:18px;flex-wrap:wrap;margin-top:10px;align-items:flex-start"><svg viewBox="0 0 ${g.nx * c} ${g.ny * c}" style="width:260px;max-width:100%;background:#0a1220;border:1px solid #ffffff22;border-radius:10px" role="img" aria-label="Map of rain rate between 90 and 78 degrees west, 18 and 32 degrees north. The heaviest rain is south of western Cuba.">${r}</svg>
    <div style="flex:1;min-width:220px"><div class="kv"><span>Heaviest rain</span><b>${I.max} mm/h at ${I.maxAt[0]}°N, ${-I.maxAt[1]}°W</b></div><div class="kv"><span>Average over the box</span><b>${I.mean} mm/h</b></div><div class="kv"><span>Cells with rain (≥0.1 mm/h)</span><b>${(I.fracRain * 100).toFixed(1)}%</b></div><div class="kv"><span>Cells with heavy rain (≥10 mm/h)</span><b>${(I.fracHeavy * 100).toFixed(1)}%</b></div>
    <p class="muted" style="font-size:12px;margin-top:8px">Colours: blue under 2.5 · green under 5 · yellow under 10 · orange under 20 · red 20 mm/h or more. Box: 90–78°W, 18–32°N, the area and date of Hurricane Ian. Map cells are 0.2° averages of the 0.1° product.</p>
    <p class="muted" style="font-size:12px;margin-top:6px"><b>What it shows:</b> the dangerous rain filled under 2% of the box. That is why your choice between a wide scan and a targeted scan mattered. This is one half-hour, not a storm history, and it did not drive the storm in your mission.</p></div></div>`; }
  if (m === 'fire') { const F = N.firms, b = F.bbox, W = 520, H = 190, x0 = -156.72, x1 = -156.25, y0 = 20.74, y1 = 20.93; const i = Math.min(F.passes.length - 1, Math.max(0, S.firmsPass == null ? 5 : S.firmsPass)), p = F.passes[i];
    const dots = F.points.filter(q => q[3] === i).map(q => `<circle cx="${((q[1] - x0) / (x1 - x0) * W).toFixed(1)}" cy="${((y1 - q[0]) / (y1 - y0) * H).toFixed(1)}" r="${Math.min(6, 1.6 + Math.sqrt(q[2]) * 0.45).toFixed(1)}" fill="#ff8a3c" fill-opacity=".75"/>`).join('');
    const hst = new Date(Date.parse(p.utc.replace('Z', ':00Z')) - 36e5 * 10).toISOString().slice(5, 16).replace('T', ' ');
    body = `<p><b>Satellite fire detections, Maui, Hawaii, 8–10 August 2023</b> · VIIRS 375 m, from NASA FIRMS</p>
    <p class="muted" style="font-size:12px;margin-top:4px">These fires took many lives. The data is shown here to learn what a polar-orbiting satellite can and cannot see, not as a game level.</p>
    <svg viewBox="0 0 ${W} ${H}" style="width:100%;max-width:${W}px;margin-top:10px;background:#0a1220;border:1px solid #ffffff22;border-radius:10px" role="img" aria-label="Plot of ${p.n} detections by longitude and latitude for the selected overpass"><line x1="${((-156.55 - x0) / (x1 - x0) * W)}" y1="0" x2="${((-156.55 - x0) / (x1 - x0) * W)}" y2="${H}" stroke="#ffffff22" stroke-dasharray="3 4"/><line x1="${((-156.38 - x0) / (x1 - x0) * W)}" y1="0" x2="${((-156.38 - x0) / (x1 - x0) * W)}" y2="${H}" stroke="#ffffff22" stroke-dasharray="3 4"/><text x="8" y="14" fill="#8fa3c4" font-size="10">West (Lahaina side)</text><text x="${W / 2 - 20}" y="14" fill="#8fa3c4" font-size="10">Central</text><text x="${W - 120}" y="14" fill="#8fa3c4" font-size="10">East (Upcountry side)</text>${dots}</svg>
    <div style="display:flex;flex-wrap:wrap;gap:5px;margin-top:8px">${F.passes.map((q, k) => `<button class="navbtn" style="margin:0;padding:4px 8px;font-size:12px;${k === i ? 'background:#ff8a3c;color:#111' : ''}" data-a="firmsPass" data-i="${k}" aria-pressed="${k === i}">${q.utc.slice(8, 10)} Aug ${q.utc.slice(11, 16)}</button>`).join('')}</div>
    <div class="kv" style="margin-top:8px"><span>Overpass (UTC · Hawaii time)</span><b>${p.utc.replace('T', ' ').replace('Z', '')} · ${hst} · ${p.sat}</b></div><div class="kv"><span>Detections: West · Central · East</span><b>${p.W} · ${p.C} · ${p.E} (total ${p.n})</b></div><div class="kv"><span>Fire radiative power: sum · strongest pixel</span><b>${p.frpSum} MW · ${p.frpMax} MW</b></div>
    <p class="muted" style="font-size:12px;margin-top:8px"><b>What it shows:</b> between 00:36 and 11:25 UTC on 9 August no VIIRS overpass saw the island for 10 h 49 min. Detections in this box went from 11 to 131 across that gap. Your mission had the same limit: a polar satellite sees a place only a few times a day, so every pass and every downlink counts. A detection is a 375 m pixel flagged as fire. It is not a count of fires and not a burn perimeter. Dot size follows fire radiative power.</p>`; }
  if (m === 'flood') { const O = N.opera.files;
    body = `<p><b>Optical water maps, central Texas, July 2025</b> · NASA/JPL OPERA DSWx-HLS (Landsat + Sentinel-2, 30 m)</p>
    <table class="xtab" style="margin-top:10px"><tr><th>Date</th><th>Hidden by cloud</th><th>Clear land</th><th>Open water seen</th></tr>${O.map(o => `<tr><td>${o.date}</td><td><div style="display:inline-block;width:120px;height:9px;background:#ffffff18;border-radius:5px;vertical-align:middle;margin-right:8px"><div style="width:${o.cloudPct}%;height:9px;background:#9fb3d1;border-radius:5px"></div></div><b>${o.cloudPct}%</b></td><td>${(o.clearLandPx * 900 / 1e6).toFixed(0)} km²</td><td>${o.waterKm2} km²</td></tr>`).join('')}</table>
    <p class="muted" style="font-size:12px;margin-top:8px"><b>What it shows:</b> during the storm days, cloud hid about nine tenths of what the optical satellites looked at. A camera cannot map a flood it cannot see. Radar passes through cloud, which is the reason your mission carried one.</p>
    <p class="muted" style="font-size:12px;margin-top:6px"><b>Limits:</b> the two optical mosaics cover different areas, and neither has data over Kerrville, Hunt or Ingram.</p>
    ${typeof NasaS1 !== 'undefined' ? `<p style="margin-top:14px"><b>Radar water maps, Kerr County, Texas</b> · NASA/JPL OPERA DSWx-S1 (Sentinel-1 radar, 30 m)</p>
    <div style="display:flex;gap:12px;flex-wrap:wrap;margin-top:8px">${NasaS1.files.map(f => `<figure style="margin:0;flex:1;min-width:260px"><img src="${f.png}" alt="Radar water map of a 45 by 25 kilometre area around Kerrville on ${f.date}. Blue marks show stretches of the Guadalupe River and small ponds." style="width:100%;image-rendering:pixelated;border:1px solid #ffffff22;border-radius:10px"><figcaption class="muted" style="font-size:12px;margin-top:4px"><b style="color:#fff">${f.date}</b> · mapped ${f.validPct}% of the area · open water ${f.waterKm2} km²</figcaption></figure>`).join('')}</div>
    <p class="muted" style="font-size:12px;margin-top:8px"><b>What it shows:</b> in the same two weeks that cloud hid most of the optical view, radar mapped all of this 45 × 25 km area. Blue is open water: stretches of the Guadalupe River and many small ponds.</p>
    <p class="muted" style="font-size:12px;margin-top:6px"><b>Limits:</b> these are two dates, not a measured before and after. A 30 m pixel misses narrow channels and water under trees, so the areas are not the size of the flood. The valley and town in your mission are fictional.</p>` : '<p class="muted" style="font-size:12px;margin-top:6px">The valley and town in your mission are fictional.</p>'}`; }
  return `<div class="glass panel" style="margin-top:16px"><h2 style="font-size:26px;margin-bottom:8px">What NASA satellites really saw ${tag}</h2>${body}<p style="margin-top:8px"><button class="navbtn" style="margin:0" data-a="sources">Files, sources and limits</button></p></div>`; }

/* ---------------- sources panel ---------------- */
function openSources(m) { m = m || missionOfScreen() || 'storm'; const list = Prov.REGISTRY.filter(r => r.m === 'all' || r.m === m);
  const names = { A: 'Observed data', B: 'Published specification', C: 'Derived by formula', D: 'Game assumption' };
  $('#layer').innerHTML = `<div class="modal-wrap"><div class="glass modal" style="max-width:980px;width:94vw"><div class="eyebrow">Data & sources · ${MX[m].name}</div><h2>Where every number comes from</h2>
   <p class="muted" style="font-size:12.5px">${Object.keys(names).map(k => `<span class="cls ${k}">${k}</span>${names[k]}`).join(' &nbsp; ')}</p>
   <div class="srcwrap"><table class="xtab"><tr><th>Class</th><th>What</th><th>Value</th><th>Source</th><th>Checked</th></tr>${list.map(r => `<tr><td><span class="cls ${r.cls}">${r.cls}</span></td><td>${r.label}</td><td>${typeof r.value === 'function' ? r.value() : r.value}</td><td>${r.url ? `<a href="${r.url}" style="color:#7fb6ff">${r.src}</a>` : r.src}</td><td class="muted">${r.checked || ''}</td></tr>`).join('')}</table></div>
   <p class="muted" style="font-size:12px;margin-top:10px">Game values are chosen for teaching and are never NASA or NOAA specifications. Rows marked "pending" or "NOT verified" are open items.</p>
   <div class="acts"><button class="btn blue" data-a="closeLayer">Close</button></div></div></div>`; }

/* ---------------- wiring ---------------- */
const _render = render; render = function () { _render(); renderCrew(false); };
const _endLaunch = endLaunch; endLaunch = function () { _endLaunch(); const m = S.mission === 'fire' ? 'fire' : S.mission === 'flood' ? 'flood' : 'storm'; S.chat = [];
  say('pip', `We're in orbit! ${MX[m].orbit === 'GEO' ? 'From geostationary orbit we watch the storm without a break.' : 'In low Earth orbit we only get short passes and short ground contacts.'} I'll bring the crew in for each challenge.`); };
document.addEventListener('change', e => { if (e.target.dataset && e.target.dataset.a === 'level') { S.level = e.target.value; S.voice = S.level === 'guided' ? S.voice : S.voice; renderCrew(false); } });
document.addEventListener('click', e => { const b = e.target.closest('[data-a]'); if (!b) return; const a = b.dataset.a, m = b.dataset.m || missionOfScreen();
  switch (a) {
    case 'chatToggle': S.chatOpen = !S.chatOpen; renderCrew(false); break;
    case 'voice': S.voice = !S.voice; if (!S.voice && 'speechSynthesis' in window) speechSynthesis.cancel(); renderCrew(false); break;
    case 'q': say('you', esc(b.textContent), { speak: false }); answer(b.dataset.q); break;
    case 'sources': openSources(); break;
    case 'closeLayer': case 'mrrBack': $('#layer').innerHTML = ''; break;
    case 'scnPractice': S.scn[m] = Scenario.generate(m, 'PRACTICE'); S.scnMode[m] = 'practice'; render(); break;
    case 'scnSurprise': S.scn[m] = Scenario.generate(m, Scenario.randomSeed(Math.random)); S.scnMode[m] = 'surprise'; render(); toast('New Mission Code: ' + S.scn[m].code); break;
    case 'scnEnter': { const p = Scenario.parseCode(document.getElementById('scnIn-' + m).value); if (!p) { toast(`Codes look like ${Scenario.PREFIX[m]}-7K3QX`); break; } if (p.mission !== m) { toast(`That code is for ${MX[p.mission].name}`); break; }
      S.scn[m] = Scenario.generate(m, p.seed); S.scnMode[m] = p.seed === 'PRACTICE' ? 'practice' : 'class'; render(); toast('Mission Code set: ' + p.code); break; }
    case 'scnCopy': try { navigator.clipboard.writeText(S.scn[m].code).then(() => toast('Code copied'), () => toast('Code: ' + S.scn[m].code)); } catch (err) { toast('Code: ' + S.scn[m].code); } break;
    case 'copyRecord': { const ta = document.getElementById('rec-' + m); try { navigator.clipboard.writeText(ta.value).then(() => toast('Mission record copied'), () => { ta.select(); toast('Select and copy the text'); }); } catch (err) { ta.select(); toast('Select and copy the text'); } break; }
    case 'mrr': mrr(m); break;
    case 'goLaunch': S.mission = m; $('#layer').innerHTML = ''; runLaunch(); break;
    case 'accept': case 'faccept': case 'laccept': { const mm = missionOfScreen(); const st = MX[mm].st(); if (st.phase === 'choose') crewAdvice(mm); break; }
    case 'pred': { const st = MX[m].st(); st.pred = st.pred || {}; st.pred[st.ci] = b.dataset.v; render(); break; }
    case 'firmsPass': { S.firmsPass = +b.dataset.i; const y = window.scrollY; render(); window.scrollTo(0, y); break; }
    case 'toggleFp': { if (e.target.closest('button')) break; const X = MX[m], st = X.st(), gi = X.fp[st.ci], opts = X.CH[st.ci].groups[gi].opts; st.choice[st.ci][gi] = st.choice[st.ci][gi] === opts[0][0] ? opts[1][0] : opts[0][0]; render(); break; }
    case 'jrSkip': if (S.jr) { S.jr.t = S.jr.h0 + 6; tickJourney(); } break;
    case 'jrSpeed': if (S.jr) { S.jr.speed = S.jr.speed === 3 ? 1 : 3; b.textContent = S.jr.speed === 3 ? '1× speed' : '3× speed'; } break;
  }
});
render();
