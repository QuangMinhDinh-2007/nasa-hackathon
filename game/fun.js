/* Earth Missions v6.1 — less reading, more doing. Loaded after final.js.
 * Hover cards teach in place; a satellite-camera HUD shows real orbit numbers; a timed "quick call" during playback
 * asks about this flight's own telemetry; XP, ranks, stars and collectible mission patches reward play.
 * Nothing here changes a simulation result or a mission score.
 */
'use strict';
document.head.insertAdjacentHTML('beforeend', `<style>
#tip{position:fixed;z-index:90;display:none;max-width:300px;padding:11px 13px;border-radius:12px;background:#0b1424f2;border:1px solid #7fb6ff66;color:#e8eefb;font-size:12.5px;line-height:1.45;box-shadow:0 10px 30px #000a;pointer-events:none}
#tip b{display:block;color:#fff;margin-bottom:3px}#tip .real{margin-top:7px;padding-top:7px;border-top:1px solid #ffffff22;color:#9fd0ff}
[data-tip]{cursor:help}button[data-tip]{cursor:pointer}.tipd{border-bottom:1px dotted #ffffff66}
.opt span{display:none}.dfoot .pred{display:none}.dfoot{justify-content:flex-end}.tkstrip .muted{display:none}.ix .sub{margin-bottom:10px}
.fold>h2{cursor:pointer;margin-bottom:0!important}.fold>h2::after{content:" ▸";color:#7fb6ff;font-size:.7em}.fold.open>h2::after{content:" ▾"}
.fold:not(.open)>*:not(h2){display:none!important}.fold.open>h2{margin-bottom:10px!important}
.povfx{position:absolute;inset:0;z-index:1;pointer-events:none;box-shadow:inset 0 0 90px 20px #000b;border-radius:inherit}
.povfx::before,.povfx::after{content:"";position:absolute;left:50%;top:50%;background:#ffffff2e}
.povfx::before{width:1px;height:26px;transform:translate(-50%,-50%)}.povfx::after{width:26px;height:1px;transform:translate(-50%,-50%)}
.povhud{position:absolute;left:14px;bottom:40px;z-index:3;display:flex;gap:6px;font:600 12px ui-monospace,Menlo,monospace;letter-spacing:.04em}
.povhud span{padding:3px 8px;border-radius:6px;background:#000a;color:#8ff0c0;border:1px solid #8ff0c044}
.call{position:absolute;left:50%;top:50%;transform:translate(-50%,-50%);z-index:6;width:min(430px,86%);padding:16px 18px;border-radius:16px;background:#08111ff5;border:1px solid #ffcc66;box-shadow:0 20px 60px #000c;text-align:center}
.call small{color:#ffcc66;font-weight:700;letter-spacing:.12em}.call p{margin:8px 0 12px;font-size:15px;font-weight:600}
.call .row{display:flex;gap:8px}.call .row button{flex:1;padding:10px;border-radius:10px;border:1px solid #ffffff44;background:#ffffff10;color:#fff;font-weight:600}
.call .row button:hover{background:#ffffff26}.call .bar{height:4px;border-radius:3px;background:#ffffff22;margin-top:12px;overflow:hidden}.call .bar i{display:block;height:4px;background:#ffcc66;width:100%;animation:callbar 8s linear forwards}
@keyframes callbar{to{width:0}}.call .res{font-size:13.5px;line-height:1.5}
#xpBtn{position:fixed;right:250px;bottom:16px;z-index:50;padding:8px 12px;border-radius:999px;border:1px solid #ffcc6688;background:#000a;color:#ffcc66;font-size:12px;font-weight:600}
.xpbar{height:8px;border-radius:5px;background:#ffffff18;margin:8px 0 14px}.xpbar i{display:block;height:8px;border-radius:5px;background:#ffcc66}
.patches{display:flex;gap:12px;flex-wrap:wrap}.patches figure{margin:0;text-align:center;font-size:12px;color:var(--muted)}
.pstars{font-size:26px;letter-spacing:4px;color:#ffcc66}.pstars i{font-style:normal;color:#ffffff30}
@media (prefers-reduced-motion: reduce){.call .bar i{animation:none}}
</style>`);
const GAME61 = '6.1';

/* ---------------- 1. hover cards ---------------- */
const tipEl = document.createElement('div'); tipEl.id = 'tip'; tipEl.setAttribute('role', 'tooltip'); document.body.appendChild(tipEl);
const PART = {
  instrument: ['Science instrument', 'Takes the images. A sharper one sees more, but its files are bigger and it uses more power.', { storm: 'The ABI imager on GOES-R sees in 16 spectral bands.', fire: 'VIIRS spots fires in pixels 375 m across.', flood: 'NISAR carries a radar, which sees the ground through cloud, day or night.' }],
  observation: ['Observation rate', 'How often the satellite can take an image. More looks mean more data to store and send.', {}],
  power: ['Power system', 'Solar panels and a battery. Everything on board runs from them.', { storm: 'In eclipse season a GOES satellite runs on its battery for up to 72 minutes a day.', flood: 'NISAR\'s solar arrays make about 5 kW and it carries a 180 amp-hour battery.' }],
  comms: ['Communications', 'The radio link to Earth. Data only counts once it has been received on the ground.', { storm: 'From 35,786 km a geostationary satellite keeps the same ground station in view all day.' }],
  storage: ['Data storage', 'Memory for images waiting to be sent. When it is full, new images are lost.', {}],
};
const partKey = k => /instr|sensor|payload|radar|optic/i.test(k) ? 'instrument' : /obs|proc|rate/i.test(k) ? 'observation' : /pow|solar|batt/i.test(k) ? 'power' : /com|link|relay|radio/i.test(k) ? 'comms' : /stor|mem/i.test(k) ? 'storage' : null;
const SIDE = [[/^Battery$/, 'Battery', 'Sunlight fills it. The computer, camera and radio drain it. If it runs too low, the satellite stops taking images to protect itself.'],
  [/^Storage used$/, 'Storage used', 'Images waiting on board. It climbs when the camera makes data faster than the radio can send it.'],
  [/^Health$/, 'Health', 'Falls when essential systems lose power. At zero the mission is lost.'],
  [/^Useful (data|maps) delivered$/, 'Delivered', 'Only data that reached Earth counts, and older data counts for less.'],
  [/coverage$|^Passes covered$/, 'Coverage', 'How much of the event your satellite has actually seen so far.'],
  [/^(Critical update|Town update|Final update|New-hotspot alert)$/, 'The delivery that matters most', 'People on the ground are waiting for this one. Miss it and the mission cannot be a full success.'],
  [/^(Mission time|Time left)$/, 'Mission clock', 'The mission lasts 24 hours, in four windows of 6 hours.'],
  [/^Next pass/, 'Passes and contacts', 'A low-orbit satellite sees the target only during a pass, and talks to the ground only during a contact.']];
const OPTFACT = [[/radar|optical|cloud/i, 'July 2025, central Texas: cloud hid about 90% of the optical view, while radar mapped all of Kerr County.'],
  [/alert/i, 'NASA FIRMS shares satellite fire detections with the public.'],
  [/power|eco|save|battery/i, 'In eclipse season a GOES satellite runs on its battery for up to 72 minutes a day.'],
  [/resolution|detail|quality/i, 'VIIRS has a 375 m and a 750 m fire product: finer detail means more data.']];
const vOrb = km => Math.sqrt(398600.4418 / (6378.137 + km));
const ORB = { storm: [35786, ''], fire: [824, '~'], flood: [747, ''] };
function tipHtml(k, el) { const m = missionOfScreen() || S.mission || 'storm';
  if (k.startsWith('part:')) { const p = PART[partKey(k.slice(5))]; if (!p) return '<b>Spacecraft part</b>Better parts do more, but add mass and cost.'; return `<b>${p[0]}</b>${p[1]}${p[2][m] ? `<div class="real">🛰 Real mission: ${p[2][m]}</div>` : ''}`; }
  if (k.startsWith('side:')) { const s = SIDE[+k.slice(5)]; return `<b>${s[1]}</b>${s[2]}`; }
  if (k.startsWith('hud:')) { const [km] = ORB[m], w = k.slice(4); return w === 'alt' ? `<b>Altitude</b>Height above the ground. ${m === 'storm' ? 'High enough to turn with the Earth and watch one side of it all day.' : 'Low enough for sharp images, but each place is seen only on a short pass.'}` : w === 'spd' ? `<b>Orbital speed</b>${vOrb(km).toFixed(2)} km/s, from v = √(μ / r). The higher the orbit, the slower the satellite.` : `<b>One orbit</b>${Math.round(Prov.periodMin(km))} minutes, from Kepler's third law. ${m === 'storm' ? 'That is one turn of the Earth, so the satellite stays over the same spot.' : `About ${Math.round(1440 / Prov.periodMin(km))} orbits a day.`}`; }
  const parts = k.split('||'); return (parts[1] ? `<b>${esc(parts[0])}</b>${esc(parts[1])}` : esc(parts[0])) + (parts[2] ? `<div class="real">🛰 Real data: ${esc(parts[2])}</div>` : ''); }
function tipShow(el) { tipEl.innerHTML = tipHtml(el.dataset.tip, el); tipEl.style.display = 'block'; const r = el.getBoundingClientRect(), w = tipEl.offsetWidth, h = tipEl.offsetHeight;
  let x = Math.min(window.innerWidth - w - 10, Math.max(10, r.left + r.width / 2 - w / 2)), y = r.top - h - 10; if (y < 10) y = Math.min(window.innerHeight - h - 10, r.bottom + 10); tipEl.style.left = x + 'px'; tipEl.style.top = y + 'px'; }
const tipHide = () => { tipEl.style.display = 'none'; };
['mouseover', 'focusin'].forEach(ev => document.addEventListener(ev, e => { const el = e.target.closest && e.target.closest('[data-tip]'); el ? tipShow(el) : tipHide(); }));
['scroll', 'click', 'keydown'].forEach(ev => document.addEventListener(ev, tipHide, true));
function tipDecorate() { const app = document.getElementById('app'); if (!app) return;
  app.querySelectorAll('[data-a="part"],[data-a="fpart"],[data-a="lpart"]').forEach(b => { b.dataset.tip = 'part:' + (b.dataset.k || ''); });
  app.querySelectorAll('.opt').forEach(b => { const t = b.querySelector('b'), d = b.querySelector('span'); if (!t || b.dataset.tip) return; const txt = t.textContent + ' ' + (d ? d.textContent : ''), f = OPTFACT.find(x => x[0].test(txt)); b.dataset.tip = [t.textContent, d ? d.textContent : '', f ? f[1] : ''].join('||'); });
  app.querySelectorAll('[title]').forEach(e => { if (!e.dataset.tip) e.dataset.tip = e.getAttribute('title'); e.removeAttribute('title'); });
  app.querySelectorAll('.side span, .side h4, .side b').forEach(e => { if (e.children.length > 1 || e.dataset.tip) return; const s = e.textContent.trim(), i = SIDE.findIndex(x => x[0].test(s)); if (i >= 0) { e.dataset.tip = 'side:' + i; e.classList.add('tipd'); e.tabIndex = 0; } }); }

/* ---------------- 2. satellite-camera view with real orbit numbers ---------------- */
function povMount() { const v = document.querySelector('.ops .view'), m = missionOfScreen(); if (!v || !m || v.querySelector('.povhud')) return; const [km, ap] = ORB[m];
  v.insertAdjacentHTML('afterbegin', '<div class="povfx"></div>');
  v.insertAdjacentHTML('beforeend', `<div class="povhud" aria-label="Orbit data"><span>◉ SAT CAM</span><span data-tip="hud:alt" tabindex="0">ALT ${ap}${km.toLocaleString('en-US')} km</span><span data-tip="hud:spd" tabindex="0">SPD ${vOrb(km).toFixed(2)} km/s</span><span data-tip="hud:orb" tabindex="0">ORBIT ${Math.round(Prov.periodMin(km))} min</span></div>`); }

/* ---------------- 3. XP, ranks, stars, mission patches ---------------- */
const LS = 'earthMissions.save.v1'; let SAVE = { xp: 0, patches: [], streak: 0 };
try { SAVE = Object.assign(SAVE, JSON.parse(localStorage.getItem(LS) || '{}')); } catch (e) {}
const saveNow = () => { try { localStorage.setItem(LS, JSON.stringify(SAVE)); } catch (e) {} };
const RANKS = [[0, 'Cadet'], [100, 'Operator'], [250, 'Flight Controller'], [450, 'Flight Director'], [700, 'Mission Legend']];
const rankOf = xp => RANKS.filter(r => xp >= r[0]).pop(), nextRank = xp => RANKS.find(r => r[0] > xp);
document.body.insertAdjacentHTML('beforeend', '<button id="xpBtn" aria-label="Your rank, XP and mission patches"></button>');
function xpUi() { document.getElementById('xpBtn').textContent = `★ ${SAVE.xp} XP · ${rankOf(SAVE.xp)[1]}`; }
function addXp(n, why) { const before = rankOf(SAVE.xp)[1]; SAVE.xp += n; saveNow(); xpUi(); const now = rankOf(SAVE.xp)[1]; toast(now !== before ? `Rank up: ${now}!  (+${n} XP)` : `+${n} XP · ${why}`); }
const MNAME = { storm: 'STORM WATCH', fire: 'WILDFIRE WATCH', flood: 'FLOOD WATCH' };
function patchSvg(p, size) { const h = Scenario.hash32(p.m + p.code), hue = { storm: 215, fire: 18, flood: 170 }[p.m], h2 = (hue + 150 + h % 60) % 360, sides = 9 + h % 4;
  const poly = Array.from({ length: sides }, (_, i) => { const a = Math.PI * 2 * i / sides - Math.PI / 2; return (60 + 56 * Math.cos(a)).toFixed(1) + ',' + (60 + 56 * Math.sin(a)).toFixed(1); }).join(' ');
  const icon = p.m === 'storm' ? '<path d="M60 44a14 14 0 1 1-14 14M60 36a22 22 0 1 0 22 22" fill="none" stroke="#fff" stroke-width="4" stroke-linecap="round"/><circle cx="60" cy="58" r="4" fill="#fff"/>'
    : p.m === 'fire' ? '<path d="M60 34c10 12 16 18 16 28a16 16 0 0 1-32 0c0-7 4-10 7-15 2 5 4 6 6 6 1-6 0-12 3-19z" fill="#fff"/>' : '<path d="M34 52q13-12 26 0t26 0M34 64q13-12 26 0t26 0M34 76q13-12 26 0t26 0" fill="none" stroke="#fff" stroke-width="4" stroke-linecap="round"/>';
  return `<svg viewBox="0 0 120 120" width="${size}" height="${size}" role="img" aria-label="Mission patch ${MNAME[p.m]} ${p.code}, ${p.pstars} of 3 stars"><polygon points="${poly}" fill="hsl(${hue} 62% 20%)" stroke="hsl(${h2} 85% 62%)" stroke-width="4" stroke-linejoin="round"/><circle cx="60" cy="60" r="41" fill="none" stroke="#ffffff33" stroke-dasharray="2 4"/>${icon}
   <text x="60" y="27" text-anchor="middle" font-size="7.5" font-weight="700" fill="#fff" letter-spacing="1">${MNAME[p.m]}</text><text x="60" y="96" text-anchor="middle" font-size="7" fill="hsl(${h2} 85% 72%)" font-family="monospace">${p.code}</text><text x="60" y="107" text-anchor="middle" font-size="9" fill="#ffcc66">${'★'.repeat(p.pstars)}${'☆'.repeat(3 - p.pstars)}</text></svg>`; }
function parScore(m) { const X = MX[m], st = X.st(); if (st.par != null) return st.par; const d = X.design(), scn = S.scn[m], g = X.CH.map(c => c.groups.map(q => q.opts.map(o => o[0])));
  const run = { storm: dd => ENG.runFull(d, dd, 'v34', scn), fire: dd => WF.runFull(d, dd, scn), flood: dd => FL.runFull(d, dd, 'v41', scn) }[m]; let best = 0;
  for (let q = 0; q < 256; q++) { const t = run(g.map((c, ci) => [c[0][(q >> (ci * 2)) & 1], c[1][(q >> (ci * 2 + 1)) & 1]])).s.total; if (t > best) best = t; } return st.par = best; }
function patchPanel(m) { const X = MX[m], st = X.st(), sc = X.eng.score(st.M), par = parScore(m), code = S.scn[m].code;
  const stars = sc.outcome === 'Mission Failure' ? 0 : sc.outcome !== 'Mission Success' ? 1 : sc.total >= par - 3 ? 3 : 2, p = { m, code, stars, score: sc.total };
  if (!st.xpDone) { st.xpDone = true; const old = SAVE.patches.find(q => q.m === m && q.code === code); if (!old) SAVE.patches.push(p); else if (p.score > old.score) Object.assign(old, p); saveNow(); setTimeout(() => addXp(20 + stars * 30, `${stars} star${stars === 1 ? '' : 's'}`), 600); }
  return `<div class="glass panel" style="margin-top:16px" id="patchPanel"><div style="display:flex;gap:20px;align-items:center;flex-wrap:wrap">${patchSvg(p, 132)}<div style="flex:1;min-width:240px">
   <div class="pstars" aria-label="${stars} of 3 stars">${'★'.repeat(stars)}<i>${'★'.repeat(3 - stars)}</i></div><h2 style="font-size:24px;margin:4px 0">Mission patch ${stars ? 'earned' : 'not earned yet'}</h2>
   <p class="muted" style="font-size:13px">You scored <b style="color:#fff">${sc.total}</b>. The reference flight for this satellite and Mission Code scores <b style="color:#fff">${par}</b>${sc.total > par ? ': you beat it.' : '.'} <span class="tipd" tabindex="0" data-tip="Reference flight||The best score any of the 256 combinations of the standard options reaches with your satellite and your Mission Code. The game flies all 256 to find it.">What is that?</span></p>
   <p class="muted" style="font-size:12.5px;margin-top:6px">★ finish without failure · ★★ Mission Success · ★★★ Mission Success within 3 points of the reference flight</p></div></div></div>`; }
function locker() { const nx = nextRank(SAVE.xp), cur = rankOf(SAVE.xp), pc = nx ? (SAVE.xp - cur[0]) / (nx[0] - cur[0]) * 100 : 100;
  $('#layer').innerHTML = `<div class="modal-wrap"><div class="glass panel" style="max-width:720px;width:92%;padding:26px" role="dialog" aria-label="Rank and patches"><h2 style="font-size:28px">${cur[1]} · ${SAVE.xp} XP</h2>
   <div class="xpbar"><i style="width:${pc}%"></i></div><p class="muted" style="font-size:12.5px;margin-top:-8px">${nx ? `${nx[0] - SAVE.xp} XP to ${nx[1]}` : 'Top rank reached'} · XP comes from quick calls during a mission, debrief questions, and stars. It never changes a mission score.</p>
   <h3 style="font-size:15px;margin:16px 0 10px">Mission patches (${SAVE.patches.length})</h3><div class="patches">${SAVE.patches.length ? SAVE.patches.map(p => `<figure>${patchSvg(p, 96)}<figcaption>${p.score} pts</figcaption></figure>`).join('') : '<p class="muted">Finish a mission to earn your first patch. Every Mission Code has its own.</p>'}</div>
   <p style="margin-top:16px;text-align:right"><button class="btn primary" data-a="closeLayer">Close</button></p></div></div>`; }

/* ---------------- 4. quick call: a timed question about this flight's own telemetry ---------------- */
predChips = function () { return ''; };
say = (f => function (who, html, o) { if (who === 'pip' && /predict/i.test(html)) return; return f(who, html, o); })(say);
runWithJourney = (f => function (m) { f(m); const j = S.jr; if (j && j.timer) j.call = { at: j.h0 + 2.5, done: false }; })(runWithJourney);
tickJourney = (f => function () { const j = S.jr; if (j && j.call && !j.call.done && j.t >= j.call.at) { j.call.done = true; clearInterval(j.timer); j.timer = null; return quickCall(j); } f(); })(tickJourney);
function quickCall(j) { const X = MX[j.m], st = X.st(), key = (st.ci % 2 === 0 && Math.round((S.live || {}).batteryPct) < 99) ? 'batteryPct' : 'storagePct', word = key === 'batteryPct' ? 'Battery' : 'Storage', now = Math.round((S.live || {})[key]), end = Math.round(X.eng.derive(st.M)[key]), truth = end > now ? 'up' : 'down';
  const v = document.querySelector('.ops .view'); if (!v || isNaN(now)) return resumeCall(j);
  v.insertAdjacentHTML('beforeend', `<div class="call" id="call" role="dialog" aria-label="Quick call"><small>📡 QUICK CALL</small><p>${word} is at ${now}% now. Where will it be at ${X.clock(j.h0 + 6).slice(0, 5)}?</p><div class="row"><button data-a="callAns" data-v="up">Higher</button><button data-a="callAns" data-v="down">Same or lower</button></div><div class="bar"><i></i></div></div>`);
  j.call.answer = a => { clearTimeout(j.call.to); const ok = a === truth; if (ok) SAVE.streak++; else SAVE.streak = 0; const gain = ok ? 20 + Math.min(20, (SAVE.streak - 1) * 5) : 0;
    const why = key === 'batteryPct' ? (truth === 'up' ? 'Sunlight put in more energy than the systems used.' : 'The computer, camera and radio used at least as much as the solar panels made.') : (truth === 'up' ? 'Images were made faster than the radio could send them.' : 'The radio sent data at least as fast as the camera made it.');
    const c = document.getElementById('call'); if (c) c.innerHTML = `<small>📡 QUICK CALL</small><p class="res">${a == null ? 'Too slow!' : ok ? `✓ Good call${SAVE.streak > 1 ? ` · streak ${SAVE.streak}` : ''}` : '✕ Not this time'} — it ends at <b>${end}%</b>.<br><span class="muted">${why}</span></p>`;
    if (gain) addXp(gain, 'quick call'); else saveNow(); setTimeout(() => resumeCall(j), 1900); };
  j.call.to = setTimeout(() => j.call.answer(null), 8000); }
function resumeCall(j) { const c = document.getElementById('call'); if (c) c.remove(); if (S.jr === j && !j.timer) j.timer = setInterval(tickJourney, 100); }

/* ---------------- 5. wiring ---------------- */
const FOLD = /Change one|Cause-and-effect|Compared with|What NASA|A real mission|Debrief|Mission record|Badges/;
softView = (f => function () { f(); povMount(); })(softView);
const _____render = render;
render = function () { _____render(); const m = missionOfScreen();
  if (m) { const X = MX[m]; if (S.screen === X.screens[1]) povMount();
    if (S.screen === X.screens[2] && X.st() && X.st().M) { const sp = document.getElementById('scorePanel'); if (sp && !document.getElementById('patchPanel')) sp.insertAdjacentHTML('beforebegin', patchPanel(m));
      S.open = S.open || {}; document.querySelectorAll('#app .panel').forEach(p => { const h = p.querySelector(':scope > h2'); if (!h || !FOLD.test(h.textContent)) return; p.classList.add('fold'); h.tabIndex = 0; h.setAttribute('role', 'button'); if (S.open[m + h.textContent.slice(0, 12)]) p.classList.add('open'); }); } }
  tipDecorate(); };
function foldToggle(h) { const p = h.parentNode; p.classList.toggle('open'); S.open[missionOfScreen() + h.textContent.slice(0, 12)] = p.classList.contains('open'); }
document.addEventListener('click', e => { if (e.target.id === 'xpBtn') return locker(); const h = e.target.closest('.fold > h2'); if (h) return foldToggle(h);
  const c = e.target.closest('[data-a="callAns"]'); if (c && S.jr && S.jr.call && S.jr.call.answer) return S.jr.call.answer(c.dataset.v); });
document.addEventListener('keydown', e => { if ((e.key === 'Enter' || e.key === ' ') && e.target.matches && e.target.matches('.fold > h2')) { e.preventDefault(); foldToggle(e.target); } });
document.addEventListener('click', e => { const b = e.target.closest('[data-a="quiz"]'); if (!b) return; const m = b.dataset.m, i = +b.dataset.i; if (S.quiz && S.quiz[m] && S.quiz[m][i] == null && QUIZ[m][i].ok === +b.dataset.k) setTimeout(() => addXp(15, 'debrief answer'), 50); }, true);
xpUi();
