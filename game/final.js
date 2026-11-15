/* Earth Missions v6.0 — clear scoring, badges, debrief quiz, how-to-play. Loaded after rescue.js.
 * Nothing here changes a simulation result. All quiz facts are class A/B/C entries of provenance.js or values computed from them.
 */
'use strict';
document.head.insertAdjacentHTML('beforeend', `<style>
.sx td,.sx th{vertical-align:top}.sx .bar{height:8px;border-radius:5px;background:#ffffff18;margin-top:6px;min-width:90px}.sx .bar i{display:block;height:8px;border-radius:5px;background:#7fb6ff}
.gate{display:flex;gap:8px;align-items:center;padding:6px 0;font-size:13px;border-bottom:1px solid #ffffff14}.gate i{width:18px;height:18px;border-radius:50%;display:grid;place-items:center;font-style:normal;font-size:12px;font-weight:700;color:#000}
.gate i.y{background:#5fe0a0}.gate i.n{background:#ff7a7a}
.badges{display:grid;grid-template-columns:repeat(auto-fill,minmax(170px,1fr));gap:10px}
.badge{padding:12px;border-radius:14px;border:1px solid #ffffff22;background:#0004;opacity:.5}
.badge.got{opacity:1;border-color:#ffcc66;background:#ffcc6614}
.badge .em{font-size:22px}.badge b{display:block;margin:4px 0 2px;font-size:13.5px}.badge span{font-size:12px;color:var(--muted)}
.qz{margin-top:14px}.qz p.q{font-weight:600;margin-bottom:8px}
.qz button{display:block;width:100%;text-align:left;padding:9px 12px;margin-bottom:6px;border-radius:10px;border:1px solid var(--line);background:#0004;color:#fff;font-size:13px}
.qz button:hover:not(:disabled){background:#ffffff14}.qz button.right{border-color:#5fe0a0;background:#5fe0a01f}.qz button.wrong{border-color:#ff7a7a;background:#ff7a7a1f}
.qz .why{font-size:12.5px;color:#cfd8ea;margin:4px 0 0;padding:8px 12px;border-left:3px solid #7fb6ff;background:#7fb6ff14;border-radius:0 8px 8px 0}
#helpBtn{position:fixed;right:132px;bottom:16px;z-index:50;padding:8px 12px;border-radius:999px;border:1px solid #ffffff33;background:#000a;color:#fff;font-size:12px}
.how{display:grid;grid-template-columns:repeat(4,1fr);gap:12px;margin:16px 0}.how div{padding:14px;border:1px solid #ffffff22;border-radius:14px;background:#0004}
.how .n{width:26px;height:26px;border-radius:50%;background:#fff;color:#000;font-weight:700;display:grid;place-items:center;margin-bottom:8px}.how b{display:block;margin-bottom:4px}.how span{font-size:12.5px;color:var(--muted);line-height:1.45}
@media(max-width:900px){.how{grid-template-columns:1fr 1fr}}
</style>`);

/* ---------------- scoring, in plain words, with the player's own numbers ---------------- */
const SCORE_TEXT = {
  storm: { names: ['Science collected', 'Data delivered', 'Efficiency', 'Reliability'],
    how: ['60%: science points collected in each of the 4 storm phases (3 points fills a phase). 40%: how many phases have at least one good image.',
          '85%: science points that reached Earth in each phase, worth less the older they are (up to 3 h 100%, 6 h 75%, 12 h 50%, older 25%). 15%: the critical update arrived before 24:00.',
          'Share of camera and radio energy, and of data created, that ended up as delivered science. Scaled by how much of the 12-point goal you delivered.',
          'Hours the essential systems had power, out of 24. Zero after a critical failure.'],
    fail: M => `a critical failure, or fewer than ${M.C.failBelowDelivered} science points delivered` },
  fire: { names: ['Fire science', 'Alerts and delivery', 'Efficiency', 'Reliability'],
    how: ['50%: science collected on each of the 4 passes. 25%: passes with a useful image. 25%: share of the fires that were detected.',
          '70%: science that reached Earth for each pass. 15%: the new-hotspot alert arrived within 2 hours. 15%: the final update arrived.',
          'Share of camera and radio energy, and of data created, that ended up as delivered science. Scaled by how much of the goal you delivered.',
          'Hours the satellite was operating, out of 24. Zero after a critical failure.'],
    fail: () => `a critical failure, or fewer than ${WF.CONFIG.failBelowDelivered} science points delivered` },
  flood: { names: ['Flood mapping', 'Map delivery', 'Efficiency', 'Reliability'],
    how: ['60%: map quality collected in each of the 3 zones. 40%: how many zones were mapped.',
          '85%: maps that reached Earth for each zone. 15%: a fresh map of the town was delivered.',
          'Share of energy and of data created that ended up as delivered maps. Scaled by how much of the goal you delivered.',
          'Hours the essential systems ran, minus half of any hours in safe mode, out of 24. Zero after a critical failure.'],
    fail: M => `a critical failure, or fewer than ${M.C.failBelow} maps delivered` },
};
function scorePanel(m) { const X = MX[m], M = X.st().M, sc = X.eng.score(M), T = SCORE_TEXT[m], pts = [sc.sci, sc.del, sc.eff, sc.rel], max = [35, 35, 20, 10];
  const ok = ['G1', 'G2', 'G3', 'G4'].map(k => sc.gates[k]);
  return `<div class="glass panel" style="margin-top:16px" id="scorePanel"><h2 style="font-size:26px;margin-bottom:6px">How your score was calculated</h2>
   <p class="muted" style="font-size:12.5px">Four parts add up to 100. The same rules apply to every player and every Mission Code.</p>
   <table class="xtab sx"><tr><th>Part</th><th>Your points</th><th>What it measures</th></tr>${T.names.map((n, i) => `<tr><td><b>${n}</b><br><span class="muted">up to ${max[i]}</span></td><td><b>${pts[i].toFixed(1)}</b><div class="bar"><i style="width:${Math.max(0, Math.min(100, pts[i] / max[i] * 100))}%"></i></div></td><td class="muted" style="font-size:12.5px">${T.how[i]}</td></tr>`).join('')}
   <tr><td><b>Total</b></td><td><b>${sc.total}</b> / 100</td><td class="muted" style="font-size:12.5px">${pts.map(p => p.toFixed(1)).join(' + ')} = ${(pts[0] + pts[1] + pts[2] + pts[3]).toFixed(1)}, rounded.</td></tr></table>
   <h3 style="font-size:15px;margin:16px 0 4px">Mission outcome: ${sc.outcome}</h3>
   <p class="muted" style="font-size:12.5px;margin-bottom:6px">The outcome does not come from the score. It comes from four requirements the people on the ground depend on.</p>
   ${X.gates.map((g, i) => `<div class="gate"><i class="${ok[i] ? 'y' : 'n'}">${ok[i] ? '✓' : '✕'}</i><span>${g}</span></div>`).join('')}
   <p class="muted" style="font-size:12.5px;margin-top:8px"><b style="color:#fff">Mission Success</b>: all four met. <b style="color:#fff">Mission Failure</b>: ${T.fail(M)}. <b style="color:#fff">Partial Success</b>: everything else. A high score with a missed requirement is still only a partial success.</p></div>`; }

/* ---------------- badges ---------------- */
function badges(m) { const X = MX[m], st = X.st(), M = st.M, sc = X.eng.score(M), prev = st.prev, out = [];
  const add = (em, name, how, got) => out.push({ em, name, how, got });
  add('🛰️', 'Mission Success', 'Meet all four mission requirements.', sc.outcome === 'Mission Success');
  add('🎯', 'Ace', 'Score 90 or more.', sc.total >= 90);
  add('♻️', 'Nothing wasted', 'Earn at least 18 of the 20 efficiency points.', sc.eff >= 18);
  add('🔋', 'Always on', 'Keep the satellite running for all 24 hours.', sc.rel >= 9.999);
  if (m === 'storm' && st.ix && st.ix[0]) { const b = st.ix[0].box, seen = seenHours(M, b, ENG.trackDev(M)); add('🌀', 'Sharp aim', 'Keep the storm in view for 5.5 of 6 hours with a box no bigger than 70%.', seen >= 5.5 && b.w <= 0.70); }
  add('🔬', 'Experimenter', 'Fly the same Mission Code again and beat your last score.', !!(prev && prev.missionCode === S.scn[m].code && sc.total > prev.result.score));
  S.badges = S.badges || {}; out.forEach(b => { if (b.got) S.badges[m + ':' + b.name] = true; });
  return `<div class="glass panel" style="margin-top:16px" id="badgePanel"><h2 style="font-size:26px;margin-bottom:10px">Badges <span class="muted" style="font-size:14px">${out.filter(b => b.got).length} of ${out.length} this flight</span></h2>
   <div class="badges">${out.map(b => `<div class="badge ${b.got ? 'got' : ''}"><div class="em" aria-hidden="true">${b.em}</div><b>${b.name}${b.got ? ' ✓' : ''}</b><span>${b.how}</span></div>`).join('')}</div></div>`; }

/* ---------------- debrief quiz (facts from the Data & sources registry) ---------------- */
const mins = km => Math.round(Prov.periodMin(km));
const QUIZ = {
  storm: [
    { q: 'Your satellite sat 35,786 km above the equator. Why does a satellite at that height seem to hang over one spot?', a: ['It has stopped moving.', 'It circles Earth once in about a day, the same rate Earth spins.', 'Earth\'s gravity is zero at that height.'], ok: 1,
      why: () => `At 35,786 km one orbit takes about ${mins(35786)} minutes, which is one turn of the Earth (23 h 56 min). The satellite and the ground move together, so it can watch one storm without a break.` },
    { q: 'In eclipse season a GOES satellite spends up to 72 minutes a day in Earth\'s shadow. What keeps it working?', a: ['Batteries charged while it was in sunlight.', 'Heat from the Earth.', 'It switches off and restarts later.'], ok: 0,
      why: () => 'Solar panels make nothing in shadow. The satellite runs on batteries, which is why battery size was part of your design.' },
    { q: 'The National Hurricane Center issues a full advisory every 6 hours. What does that mean for an image that reaches Earth 10 hours after it was taken?', a: ['Nothing. Data never gets old.', 'It is worth more, because it is rare.', 'It is worth less: newer forecasts have already been made without it.'], ok: 2,
      why: () => 'In the game an image older than 6 hours counts for half or less. Getting data down in time matters as much as taking it.' }],
  fire: [
    { q: 'The real Maui data had a gap of 10 h 49 min with no satellite pass. Why can a polar-orbiting satellite not watch one place all the time?', a: ['It flies low and fast, so it passes over a place only a few times a day.', 'Its camera needs to cool down.', 'It only works at night.'], ok: 0,
      why: () => 'A low orbit gives sharp images but short visits. Across that one gap the detections in the Maui box went from 11 to 131.' },
    { q: 'NASA FIRMS lists "active fire detections". What is one detection?', a: ['One separate wildfire.', 'One 375-metre pixel the instrument flagged as fire.', 'One burned building.'], ok: 1,
      why: () => 'A big fire fills many pixels and a small one may fill none. Detections are not a count of fires and not a burn perimeter.' },
    { q: 'Why did your satellite send a small alert before the full image?', a: ['Alerts look better.', 'The image is not needed.', 'A small message fits into a short contact, so the warning arrives in time.'], ok: 2,
      why: () => 'Ground contacts are short. In this game an alert is tiny compared with an image, so it gets through first.' }],
  flood: [
    { q: 'In the real Texas data, cloud hid about 90% of what the optical satellites looked at. Why could radar still map the ground?', a: ['Radar flies below the clouds.', 'Radar sends its own microwaves, which pass through cloud.', 'Radar waits for the clouds to clear.'], ok: 1,
      why: () => 'An optical camera needs sunlight reflected from the ground. A radar brings its own signal, day or night, cloud or not.' },
    { q: 'NISAR passes over the same ground once every 12 days. In the game you passed the valley 8 times in one day. What is that?', a: ['How NISAR really works.', 'A mistake in the game.', 'Time compressed for teaching. Real flood mapping uses several satellites.'], ok: 2,
      why: () => 'One satellite cannot revisit a flood every few hours. The game squeezes time so each decision has a visible result.' },
    { q: 'NISAR orbits at 747 km. About how long does one orbit take?', a: [`About ${mins(747)} minutes.`, 'About 24 hours.', 'About 12 days.'], ok: 0,
      why: () => `Kepler's third law gives ${Prov.periodMin(747).toFixed(1)} minutes at 747 km, so about 14 orbits a day. The 12 days is how long until the ground track repeats.` }],
};
function quizPanel(m) { S.quiz = S.quiz || {}; const ans = S.quiz[m] = S.quiz[m] || []; const Q = QUIZ[m], n = Q.filter((q, i) => ans[i] === q.ok).length, done = Q.every((q, i) => ans[i] != null);
  return `<div class="glass panel" style="margin-top:16px" id="quizPanel"><h2 style="font-size:26px;margin-bottom:4px">Debrief: 3 quick questions</h2><p class="muted" style="font-size:12.5px">Not part of your score.${done ? ` You got <b style="color:#fff">${n} of 3</b>.` : ''}</p>
   ${Q.map((q, i) => `<div class="qz"><p class="q">${i + 1}. ${q.q}</p>${q.a.map((t, k) => `<button data-a="quiz" data-m="${m}" data-i="${i}" data-k="${k}" ${ans[i] != null ? 'disabled' : ''} class="${ans[i] != null && k === q.ok ? 'right' : ans[i] === k ? 'wrong' : ''}">${t}${ans[i] != null && k === q.ok ? ' ✓' : ans[i] === k ? ' ✕' : ''}</button>`).join('')}${ans[i] != null ? `<p class="why">${q.why()}</p>` : ''}</div>`).join('')}
   <p style="margin-top:10px"><button class="navbtn" style="margin:0" data-a="sources">Where these facts come from</button></p></div>`; }

/* ---------------- how to play ---------------- */
function howTo() { $('#layer').innerHTML = `<div class="modal-wrap"><div class="glass panel" style="max-width:860px;width:92%;padding:26px" role="dialog" aria-label="How to play">
  <h2 style="font-size:28px">How to play</h2><p class="muted">You are the Flight Director. Design a satellite, fly it for 24 hours, and get the data to the people who need it.</p>
  <div class="how"><div><div class="n">1</div><b>Build</b><span>Choose 5 parts. Stay under the mass and budget limits. Better parts cost more and weigh more.</span></div>
  <div><div class="n">2</div><b>Launch</b><span>Pass the readiness review: launch, space, ground and user segments.</span></div>
  <div><div class="n">3</div><b>Operate</b><span>Four challenges, 6 hours each. What you use now (battery, storage) is what you have left later.</span></div>
  <div><div class="n">4</div><b>Report</b><span>See your score, what one different move would have changed, and what real NASA satellites saw.</span></div></div>
  <p class="muted" style="font-size:12.5px">Tip: type a Mission Code your class shares, so everyone flies the same conditions and you can compare. Every number has a source under “Data & sources”.</p>
  <p style="margin-top:14px;text-align:right"><button class="btn primary" data-a="closeLayer">Got it</button></p></div></div>`; }
document.body.insertAdjacentHTML('beforeend', '<button id="helpBtn">? How to play</button>');

/* ---------------- wiring ---------------- */
const ___render = render;
render = function () { ___render(); const m = missionOfScreen(); if (!m) return; const X = MX[m];
  if (S.screen === X.screens[2] && X.st() && X.st().M) { const h2 = [...document.querySelectorAll('.panel h2')].find(e => /Change one/.test(e.textContent));
    if (h2 && !document.getElementById('scorePanel')) { h2.parentNode.insertAdjacentHTML('beforebegin', scorePanel(m) + badges(m)); const real = [...document.querySelectorAll('.panel h2')].find(e => /A real mission like yours/.test(e.textContent)); (real ? real.parentNode : h2.parentNode).insertAdjacentHTML('afterend', quizPanel(m)); } }
  if (S.screen === X.screens[0] && !S.howSeen) { S.howSeen = true; howTo(); } };
document.addEventListener('click', e => { if (e.target.id === 'helpBtn') return howTo(); const b = e.target.closest('[data-a="quiz"]'); if (!b) return;
  const m = b.dataset.m; S.quiz[m][+b.dataset.i] = +b.dataset.k; const p = document.getElementById('quizPanel'); if (p) p.outerHTML = quizPanel(m); });

/* ---------------- direct tasking: Wildfire regions and Flood passes (wired to engine ext) ---------------- */
document.head.insertAdjacentHTML('beforeend', `<style>
.tk{position:absolute;z-index:4;border:2px dashed #ffffff55;border-radius:10px;background:transparent;color:#fff;text-align:left;padding:0}
button.tk{cursor:pointer}button.tk:hover{background:#ffffff10}.tk.on{border:2px solid #ffcc66;background:#ffcc6612}
.tk span{position:absolute;left:8px;bottom:6px;font-size:12px;font-weight:600;padding:2px 7px;border-radius:6px;background:#000a}.tk.on span{background:#ffcc66;color:#111}
.tkstrip{margin:0 0 14px;padding:4px 2px;font-size:13px}
.tkstrip b{color:#fff}.tkstrip .row{display:flex;gap:10px;align-items:center;flex-wrap:wrap;margin-top:8px}.tkstrip .row>span{min-width:110px;color:var(--muted);font-size:12px}
.vzone .tkz{position:absolute;left:12px;top:66px;font-size:12px;font-weight:700;padding:2px 7px;border-radius:6px;background:#ffcc66;color:#111;margin-right:4px}
.vzone .tkz+.tkz{top:88px}
</style>`);
fpAttr = function () { return ''; };
const FDET = n => n >= 3 ? WF.CONFIG.footprint.wide.detect : n === 1 ? WF.CONFIG.footprint.targeted.detect : (WF.CONFIG.footprint.wide.detect + WF.CONFIG.footprint.targeted.detect) / 2;
function fireTask() { const o = S.f, ci = o.ci; o.task = o.task || []; if (!o.task[ci]) { const prev = o.task.slice(0, ci).reverse().find(Boolean); o.task[ci] = { regions: prev ? prev.regions.slice() : ['A', 'B', 'C'] }; }
  o.M.ext[ci] = o.task[ci]; if (ci === 0 || ci === 3) o.choice[ci][0] = o.task[ci].regions.length === 3 ? 'wide' : 'targeted'; return o.task[ci]; }
function floodTask() { const o = S.l, ci = o.ci, C = o.M.C; o.task = o.task || []; if (!o.task[ci]) { const prev = o.task[ci - 1]; const wide = prev ? prev.zones.every(z => z === 'ALL') : true; o.task[ci] = { zones: wide ? ['ALL', 'ALL'] : C.targets[ci].slice() }; }
  if (ci === 3) o.task[ci].zones[0] = 'TOWN'; o.M.ext[ci] = o.task[ci]; if (ci === 0) o.choice[0][1] = o.task[0].zones.every(z => z === 'ALL') ? 'wide' : 'focused'; return o.task[ci]; }
function hideOg(i) { const og = document.querySelectorAll('.decision .opts .og')[i]; if (og) og.style.display = 'none'; const op = document.querySelector('.decision .opts'); if (op) op.style.gridTemplateColumns = '1fr'; }
function taskMount() { const view = document.querySelector('.view'); if (!view) return;
  if (S.screen === 'fops' && S.f && S.f.M) { const o = S.f, choose = o.phase === 'choose'; const sb = view.querySelector('.scanbox'); if (sb) sb.remove(); view.querySelectorAll('.tk').forEach(e => e.remove());
    const t = choose ? fireTask() : (o.task || []).slice(0, o.ci + 1).reverse().find(Boolean); if (!t) return;
    view.insertAdjacentHTML('beforeend', Object.keys(REG).map(k => { const r = REG[k], on = t.regions.includes(k), st = `left:${r.l}%;top:${r.t}%;width:${r.w}%;height:${r.h}%`;
      return choose ? `<button class="tk ${on ? 'on' : ''}" data-a="tkReg" data-r="${k}" style="${st}" aria-pressed="${on}" aria-label="Region ${r.n}. ${on ? 'Targeted' : 'Not targeted'}."><span>${on ? '✓ Targeted' : '+ Add target'}</span></button>` : on ? `<div class="tk on" style="${st};pointer-events:none"></div>` : ''; }).join(''));
    const n = view.querySelector('.note[style*="right"]'); if (n && choose) n.textContent = 'Click a region to target it or drop it';
    if (choose && !document.getElementById('tkStrip')) { const opts = document.querySelector('.decision .opts'); if (opts) { if (o.ci === 0 || o.ci === 3) hideOg(0);
      opts.insertAdjacentHTML('beforebegin', `<div class="tkstrip" id="tkStrip"><b>Task the camera for the ${pT(o.ci)} pass.</b> Click regions on the map. Targets: <b>${t.regions.join(', ')}</b> · detection sensitivity <b>${Math.round(FDET(t.regions.length) * 100)}%</b>.<br><span class="muted" style="font-size:12px">Fewer regions give a sharper look at each one. A fire in a region you leave out is not seen on this pass.</span></div>`); } } }
  if (S.screen === 'lops' && S.l && S.l.M) { const o = S.l, choose = o.phase === 'choose', C = o.M.C; view.querySelectorAll('.tkz').forEach(e => e.remove()); { const sb = view.querySelector('.scanbox'); if (sb) sb.remove(); const n = view.querySelector('.note[style*="right"]'); if (n) n.textContent = 'Yellow tags = where each pass is aimed'; }
    const t = choose ? floodTask() : (o.task || [])[o.ci]; if (!t) return; const zs = [...view.querySelectorAll('.vzone')];
    t.zones.forEach((z, k) => FL.ZONES.forEach((q, i) => { if ((z === 'ALL' || z === q) && zs[i]) zs[i].insertAdjacentHTML('beforeend', `<span class="tkz" style="left:${12 + k * 58}px;top:66px">Pass ${k + 1}</span>`); }));
    if (choose && !document.getElementById('tkStrip')) { const opts = document.querySelector('.decision .opts'); if (opts) { if (o.ci === 0) hideOg(1);
      const seg = k => (o.ci === 3 && k === 0) ? '<b>Town</b> <span class="muted" style="font-size:12px">(emergency request, fixed)</span>' : `<div class="sg2">${FL.ZONES.concat(['ALL']).map(z => `<button class="${t.zones[k] === z ? 'on' : ''}" data-a="tkZone" data-k="${k}" data-z="${z}" aria-pressed="${t.zones[k] === z}">${z === 'ALL' ? 'All three' : FL.ZNAME[z]}</button>`).join('')}</div>`;
      opts.insertAdjacentHTML('beforebegin', `<div class="tkstrip" id="tkStrip"><b>Aim each pass.</b> One zone gives full detail. All three at once gives ${Math.round(C.footprint.wide * 100)}% detail in each.${[0, 1].map(k => `<div class="row"><span>Pass ${k + 1} · ${lt(C.passes[o.ci * 2 + k].h)}</span>${seg(k)}</div>`).join('')}</div>`); } } } }
softView = (f => function () { f(); taskMount(); })(softView);
const ____render = render; render = function () { ____render(); taskMount(); };
document.addEventListener('click', e => { const b = e.target.closest('[data-a="tkReg"],[data-a="tkZone"]'); if (!b) return;
  if (b.dataset.a === 'tkReg') { const t = S.f.task[S.f.ci], r = b.dataset.r; if (t.regions.includes(r)) { if (t.regions.length === 1) return toast('Target at least one region'); t.regions = t.regions.filter(x => x !== r); } else t.regions = t.regions.concat(r).sort(); }
  else S.l.task[S.l.ci].zones[+b.dataset.k] = b.dataset.z;
  render(); });
MX.fire.runFull = (d, dec, scn) => { const st = S.f, e = JSON.parse(JSON.stringify(st.M.ext)); [0, 3].forEach(ci => { if (dec[ci][0] !== st.choice[ci][0]) e[ci] = { regions: dec[ci][0] === 'wide' ? ['A', 'B', 'C'] : ['A'] }; }); return WF.runFull(d, dec, scn, e, archOf('fire')); };
MX.flood.runFull = (d, dec, scn) => { const st = S.l, e = JSON.parse(JSON.stringify(st.M.ext)); if (dec[0][1] !== st.choice[0][1]) e[0] = { zones: dec[0][1] === 'wide' ? ['ALL', 'ALL'] : st.M.C.targets[0].slice() }; return FL.runFull(d, dec, 'v41', scn, e); };
