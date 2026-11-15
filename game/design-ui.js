/* Earth Missions v7.0 — Mission Design flow (UI). Loaded last.
 * Briefing -> student target -> builder linked to requirements -> Design Check -> launch -> operate -> verification ->
 * Improve My Mission (redesign, same Mission Code) -> comparison.
 * All definitions, measurements and checks come from mission-design.js (MissionDesign); all results come from the engines.
 * State added here: S.target (chosen target per mission), S.redo (original run kept for comparison), S.mdNote (last change note).
 * Hardware state stays S.design / S.fdesign / S.ldesign. Architecture state is S.arch (upgrade.js).
 */
'use strict';
(function () {
  const D = MissionDesign;
  const BUILD = { storm: 'build', fire: 'fbuild', flood: 'lbuild' }, MOF = { build: 'storm', fbuild: 'fire', lbuild: 'flood' };
  const PART_ACT = { part: 'storm', fpart: 'fire', lpart: 'flood' };
  const clone = o => JSON.parse(JSON.stringify(o));
  S.target = S.target || { storm: null, fire: null, flood: null };
  S.redo = S.redo || {}; S.mdNote = S.mdNote || {};

  document.head.insertAdjacentHTML('beforeend', `<style>
.brief{max-width:1180px;padding-bottom:120px!important}
.brief h1{font-size:clamp(34px,4.2vw,60px)!important}
.bf-grid{display:grid;grid-template-columns:1fr 1fr;gap:14px;margin-top:22px}
.bf-card{padding:18px 20px}
.bf-card h3{font-size:12px;letter-spacing:.14em;text-transform:uppercase;color:var(--blue);font-weight:600;margin-bottom:8px}
.bf-card p{font-size:15px;line-height:1.55}
.bf-card details{margin-top:10px;font-size:12.5px;color:var(--muted);line-height:1.5}
.bf-card summary{cursor:pointer;color:#9cc9ff}
.bf-row{display:grid;grid-template-columns:1fr 1fr;gap:12px;margin-top:18px}
.bf-mini{padding:14px 18px;font-size:15px;line-height:1.45}.bf-mini b{display:block;font-size:12px;letter-spacing:.14em;text-transform:uppercase;color:var(--blue);font-weight:600;margin-bottom:4px}
.bf-chips{display:flex;flex-wrap:wrap;gap:8px;align-items:center;margin-top:14px}.bf-chips .chip{height:28px;color:#fff;font-size:12.5px}.bf-lab{font-size:12px;letter-spacing:.14em;text-transform:uppercase;color:var(--dim);font-weight:600;margin-right:4px}
.bf-more{margin-top:12px;font-size:13px}.bf-more>summary{cursor:pointer;color:#9cc9ff;font-size:12.5px}.bf-more .bf-card{padding:0}.bf-more .bf-card p{font-size:13px}.bf-more .bf-grid{margin-top:12px;gap:16px 24px}
.bf-sec{margin-top:26px}
.bf-sec h2{font-family:Anton,sans-serif;font-weight:400;font-size:30px;text-transform:uppercase;line-height:1.05}
.bf-sec>p{color:var(--muted);max-width:820px;line-height:1.55;margin-top:6px;font-size:13.5px}
.bf-req{display:grid;grid-template-columns:repeat(4,1fr);gap:10px;margin-top:14px}
.bf-req div{padding:12px 14px;border-radius:14px;border:1px solid var(--line);background:#0005;font-size:13px;line-height:1.45}
.bf-req b{display:block;font-size:12px;color:var(--dim);letter-spacing:.1em;margin-bottom:4px}
.tg-grid{display:grid;grid-template-columns:repeat(3,1fr);gap:14px;margin-top:16px}
.tg{display:flex;flex-direction:column;gap:8px;text-align:left;padding:16px 18px;border-radius:18px;border:1.5px solid var(--line);background:#0006;color:#fff;font:inherit;cursor:pointer}
.tg:hover{border-color:var(--line2)}.tg[aria-checked="true"]{border-color:var(--blue);box-shadow:0 0 0 1px var(--blue) inset;background:#2f7dff14}
.tg .t{display:flex;justify-content:space-between;gap:10px;font-size:17px;font-weight:600}
.tg .mark{width:22px;height:22px;border-radius:50%;border:1.5px solid #ffffff73;flex:none;display:grid;place-items:center;font-size:12px;font-weight:700}
.tg[aria-checked="true"] .mark{background:var(--blue);border-color:var(--blue);color:#06101f}
.tg .s{font-size:14px;line-height:1.45}
.tg .k{font-size:12px;color:var(--muted);line-height:1.5}.tg .k b{color:#cfe0ff;font-weight:600}
.ar-wrap{margin-top:16px}.ar-h{font-size:16px;font-weight:600}.ar-h span{font-size:12.5px;font-weight:400;color:var(--muted);margin-left:8px}
.ar-grid{display:grid;grid-template-columns:1fr 1fr;gap:14px;margin-top:10px}.tg.ar{min-height:0}
.md-redo+.md-strip+.ar-wrap,.panel>.ar-wrap{margin-top:12px}
@media(max-width:1000px){.ar-grid{grid-template-columns:1fr}}
.chain{display:flex;flex-wrap:wrap;gap:6px;align-items:center;margin-top:14px;font-size:12px}
.chain span{padding:4px 10px;border-radius:999px;border:1px solid var(--line);color:var(--muted)}
.chain span.on{border-color:var(--blue);color:#fff;background:#2f7dff26}
.chain span.done{color:#fff}
.chain i{color:var(--dim);font-style:normal}
.bf-foot{display:flex;gap:14px;align-items:center;justify-content:flex-end;margin-top:26px}
.md-strip{margin:12px 0 0;padding:12px 14px;border-radius:14px;border:1px solid #5aa9ff55;background:#5aa9ff10;font-size:13px;line-height:1.5}
.md-strip .h{display:flex;justify-content:space-between;gap:10px;align-items:baseline}
.md-strip .h b{font-size:12px;letter-spacing:.12em;text-transform:uppercase;color:var(--blue)}
.md-strip button{background:none;border:0;color:#9cc9ff;font:inherit;font-size:12.5px;cursor:pointer;padding:0}
.md-note{margin-top:8px;padding-top:8px;border-top:1px dashed #ffffff22;font-size:12.5px}
.md-note.easier b{color:var(--good)}.md-note.harder b{color:#ff8a6b}.md-note.same b,.md-note.blocked b,.md-note.unknown b{color:var(--warn)}
.md-redo{margin:12px 0 0;padding:12px 14px;border-radius:14px;border:1px solid #3ddc9766;background:#3ddc9712;font-size:13px;line-height:1.5}
.md-redo b.h{display:block;font-size:12px;letter-spacing:.12em;text-transform:uppercase;color:var(--good);margin-bottom:2px}
.md-link{margin-top:14px;padding:12px 14px;border-radius:14px;border:1px solid var(--line);background:#0005;font-size:13px;line-height:1.5}
.md-link dl{display:grid;grid-template-columns:150px 1fr;gap:6px 12px;margin:0}
.md-link dt{color:var(--muted);font-size:12.5px}.md-link dd{margin:0}
.md-link .tg-rel{margin-top:8px;font-size:12.5px;color:#cfe0ff}
.vr-row{border-bottom:1px solid #ffffff14}.vr-row:last-child{border-bottom:0}
.vr-row summary{display:grid;grid-template-columns:98px 1fr auto;gap:12px;align-items:center;padding:10px 0;cursor:pointer;list-style:none;font-size:13px}
.vr-row summary::-webkit-details-marker{display:none}
.vr-row summary .rq b{display:block;font-weight:600}.vr-row summary .rq span{font-size:12px;color:var(--muted)}
.vr-row summary .ms{font-weight:600;text-align:right;font-size:12.5px;max-width:230px}
.vr-body{padding:0 0 14px 110px;font-size:12.5px;line-height:1.6;color:#cfd8ea}
.vr-body ul{padding-left:18px;margin:4px 0 8px}.vr-body .lab{color:var(--dim);font-size:12px;letter-spacing:.08em;text-transform:uppercase;margin-top:6px}
.vr-chain{display:grid;grid-template-columns:repeat(4,1fr);gap:6px;margin-top:8px}
.vr-chain div{padding:8px 10px;border-radius:10px;background:#ffffff0d;border:1px solid #ffffff14;font-size:12px}.vr-chain div b{display:block;font-size:12px;color:var(--dim);font-weight:600;margin-bottom:2px}
.vr-tgt{margin-top:10px;border:1px solid #5aa9ff55;border-radius:14px;padding:0 14px;background:#5aa9ff0d}
.report{padding-bottom:96px}
.cmp td.up{color:var(--good)}.cmp td.down{color:#ff8a6b}
.cmp-note{font-size:12.5px;color:var(--muted);line-height:1.55;margin-top:8px}
@media(max-width:1000px){.bf-grid,.tg-grid,.bf-row{grid-template-columns:1fr}.bf-req{grid-template-columns:1fr 1fr}.vr-body{padding-left:0}.vr-chain{grid-template-columns:1fr 1fr}.md-link dl{grid-template-columns:1fr}}
</style>`);

  /* ---- P1: Wildfire mission architecture (two options; changes real engine inputs: passes, contacts, eclipse) ---- */
  function archPicker(m, compact) { const opts = D.archOptions(m); if (opts.length < 2) return ''; const sel = archOf(m);
    return `<div class="ar-wrap"><h3 class="ar-h">Choose your orbit</h3>
      <div class="ar-grid" role="radiogroup" aria-label="Mission orbit">${opts.map(a => `<button class="tg ar" role="radio" aria-checked="${sel === a.id}" data-a="pickArch" data-v="${a.id}">
        <span class="t">${a.short}<span class="mark" aria-hidden="true">${sel === a.id ? '✓' : ''}</span></span><span class="s">${a.plain}</span>
        <span class="k">Passes ${a.passes.join(', ')} · ${a.contactHours} h of contacts · ${a.eclipseMin ? `eclipse ${a.eclipseMin} of every ${a.orbitMin} min` : 'no eclipse'}</span><span class="k"><b>+</b> ${a.gain} <b>−</b> ${a.cost}</span></button>`).join('')}</div>
      <p class="muted" style="font-size:12px;margin-top:8px">Fire detection is the same in both. Simplified teaching schedules, not computed orbits.</p></div>`; }
  window.ARCH_UI = {}; D.archOptions('fire').forEach(a => { window.ARCH_UI[a.id] = { name: a.short }; });
  window.archLabel = () => { const a = D.archInfo('fire', archOf('fire')); return a ? a.short : ''; };
  // Mission Code events are shown with the selected orbit's clock times; the parameters the engine uses never change.
  function syncFireScn() { const want = archOf('fire'), has = S.scn.fire.archView || D.DEFAULT_ARCH.fire; if (want !== has) S.scn.fire = WFEngine.scenarioView(Scenario.generate('fire', S.scn.fire.seed), want); }
  function archText() { if (S.screen !== 'fbuild' || archOf('fire') === D.DEFAULT_ARCH.fire) return;
    document.querySelectorAll('#app .build .bcard .desc, #app .build .bq').forEach(e => { e.textContent = e.textContent.replace('No solar power in eclipse.', 'This orbit has no eclipse.').replace('passes and eclipses', 'passes and the solar fault'); }); }

  const CHAIN = ['Scientific need', 'Your requirement', 'Design decision', 'Simulated outcome', 'Verification'];
  const chain = on => `<div class="chain" aria-label="From need to verification">${CHAIN.map((c, i) => `${i ? '<i aria-hidden="true">→</i>' : ''}<span class="${i === on ? 'on' : i < on ? 'done' : ''}">${c}</span>`).join('')}</div>`;
  const tgt = m => D.targetDef(m, S.target[m]);

  /* ================= 1. briefing + target (before the builder) ================= */
  V.brief = () => { const m = S.mission || 'storm', B = D.BRIEFING[m], Q = D.BRIEF[m], sel = S.target[m];
    return `<div class="screen page brief">
      <button class="linkback" data-a="go" data-to="missions">← All missions</button>
      <div class="eyebrow" style="margin-top:14px">Mission briefing · ${D.NAME[m]}</div>
      <h1 class="display">${Q.what}</h1>
      <div class="bf-row"><div class="glass bf-mini"><b>Who needs you</b>${Q.who}</div><div class="glass bf-mini"><b>What makes it hard</b>${Q.hard}</div></div>
      <div class="bf-chips"><span class="bf-lab">To succeed</span>${Q.req.map(r => `<span class="chip">${r}</span>`).join('')}</div>
      <details class="bf-more"><summary>Read more</summary><div class="bf-grid">${B.cards.map(c => `<div class="bf-card"><h3>${c[0]}</h3><p>${c[1]}</p><p class="muted">${c[2]}</p></div>`).join('')}</div><p class="muted" style="margin-top:10px;font-size:12.5px">${D.WHY_ORBIT[m]}</p></details>
      ${archPicker(m)}
      <div class="bf-sec"><h2>Pick your target</h2><p>One extra goal, measured after the flight. No points, just proof.</p>
        <div class="tg-grid" role="radiogroup" aria-label="Mission target">${D.TARGETS[m].map(t => `<button class="tg" role="radio" aria-checked="${sel === t.id}" data-a="pickTarget" data-t="${t.id}">
          <span class="t">${t.title}<span class="mark" aria-hidden="true">${sel === t.id ? '✓' : ''}</span></span><span class="s">${t.statement}</span></button>`).join('')}</div>
        ${sel ? `<details class="bf-more" style="margin-top:10px"><summary>How "${tgt(m).title}" is measured</summary><p class="muted" style="font-size:12.5px;line-height:1.6;margin-top:6px"><b style="color:#cfe0ff">Measured as:</b> ${tgt(m).definition}<br><b style="color:#cfe0ff">Checked by:</b> ${tgt(m).verify}<br><b style="color:#cfe0ff">What it demands:</b> ${tgt(m).demands}<br>The number is a teaching choice for this game, not a scientific limit. It never replaces a mandatory requirement.</p></details>` : ''}</div>
      <div class="bf-foot"><span class="muted" style="font-size:12.5px">${sel ? '' : 'Choose a target to continue.'}</span>
        <button class="btn good" data-a="briefGo" ${sel ? '' : 'disabled'}>Build your satellite →</button></div></div>`; };

  /* ================= 2. builder: target strip, part links, change note, redo banner ================= */
  function noteHtml(m) { const n = S.mdNote[m]; if (!n) return ''; return `<div class="md-note ${n.dir}" role="status"><b>${n.what}:</b> ${n.text} <span class="muted">Tested by flying 256 standard decision plans in practice conditions. It is not a prediction of your flight.</span></div>`; }
  function stripHtml(m) { const t = tgt(m), R = S.redo[m];
    const redo = R ? (() => { const o = R.original, s = o.summary, missed = D.GATES[m].filter(g => !s.gates[g.id]).map(g => g.text.toLowerCase());
      return `<div class="md-redo"><b class="h">Improving your mission · Mission Code ${R.code} is locked</b>Original flight: <b>${s.score} points, ${s.outcome}</b>. ${missed.length ? `Missed: ${missed.join('; ')}.` : 'All four mandatory requirements met.'} ${s.target ? `Target ${s.target.status.toLowerCase()} (${s.target.text}).` : ''}
        Change one or more parts${m === 'fire' ? ' or the orbit' : ''}, then launch again. The outside conditions will be exactly the same. <button class="htp-link" style="display:inline;margin:0" data-a="redoCancel" data-m="${m}">Stop improving and start fresh</button></div>`; })() : '';
    return `${redo}<div class="md-strip"><div class="h"><b>Your target</b>${R ? '' : '<button data-a="changeTarget">Change target</button>'}</div>
      ${t ? `<b>${t.title}.</b> ${t.statement}` : 'No target chosen yet. <button data-a="changeTarget">Choose one</button>'}${noteHtml(m)}</div>${m === 'fire' ? (R ? archPicker(m, true) : `<div class="md-strip" style="border-color:var(--line);background:#0004"><div class="h"><b style="color:var(--muted)">Your orbit</b><button data-a="changeTarget">Change orbit</button></div>${window.archLabel()}: ${D.archInfo('fire', archOf('fire')).facts.join(' · ')}</div>`) : ''}`; }
  function linkHtml(m, k) { const X = BX[m], L = D.partLink(m, X.design(), k), t = tgt(m), rel = t && t.parts.includes(k);
    return `<div class="md-link"><dl><dt>What it gives you</dt><dd>${L.gives}</dd><dt>What it uses</dt><dd>${L.uses}</dd><dt>Requirement it supports</dt><dd>${L.supports.charAt(0).toUpperCase() + L.supports.slice(1)}.</dd><dt>What it makes harder</dt><dd>${L.harder}</dd></dl>
      ${t ? `<div class="tg-rel">${rel ? `This part matters for your target (${t.title}). Change it and watch the note under "Your target".` : `Your target (${t.title}) depends mostly on other parts: ${t.parts.map(p => X.label[p].toLowerCase()).join(', ')}.`}</div>` : ''}</div>`; }
  function builderMount() { const m = MOF[S.screen]; if (!m) return; const panel = document.querySelector('#app .build .panel'); if (!panel) return;
    if (S.redo[m]) S.redo[m].pending = true;
    if (!panel.querySelector('.md-strip')) { const h2 = panel.querySelector(':scope > h2'); if (h2) h2.insertAdjacentHTML('afterend', stripHtml(m)); }
    archText();
    const body = panel.querySelector('.bsec.open .bbody'); if (body && !body.querySelector('.md-link')) { const k = panel.querySelector('.bsec.open .bhead').dataset.bopen; body.insertAdjacentHTML('beforeend', linkHtml(m, k)); } }

  /* ================= 3. report: requirements verification + redesign comparison ================= */
  const chip = s => `<span class="chip ${s === 'Met' ? 'good' : s === 'Not applicable' ? '' : 'bad'}">${s}</span>`;
  function rowHtml(r, open) { return `<details class="vr-row" ${open ? 'open' : ''}><summary>${chip(r.status)}<span class="rq"><b>${r.title ? r.title + ': ' : ''}${r.requirement}</b><span>Needs ${r.threshold}</span></span><span class="ms">${r.measured}</span></summary>
    <div class="vr-body"><div><b style="color:#fff">Why:</b> ${r.why}</div>
      <div class="lab">Evidence from the simulation</div><ul>${r.evidence.map(e => `<li>${esc(e)}</li>`).join('')}</ul>
      <div class="lab">Design choices that mattered</div><div>${r.parts.map(p => p.name).join(' · ')}</div>
      <div class="lab">Operational decisions that mattered</div><div>${r.challenges.map(c => `Challenge ${c.n}: ${c.text}`).join(' · ')}</div>
      <div class="vr-chain"><div><b>Design choice</b>${r.chain.design}</div><div><b>Resource constraint</b>${r.chain.constraint}</div><div><b>Operational decision</b>${r.chain.decision}</div><div><b>Mission outcome</b>${r.chain.outcome}</div></div></div></details>`; }
  function verifyHtml(m) { const X = MX[m], st = X.st(), sc = X.eng.score(st.M), v = D.verify(m, st.M, sc, { targetId: S.target[m], decisionText: st.log.map((L, i) => L ? L.choices : st.choice[i].join(' + ')) });
    const firstMiss = v.gates.findIndex(g => g.status !== 'Met'), nMet = v.gates.filter(g => g.status === 'Met').length;
    return `<div class="glass panel" id="verifyPanel"><h2 style="font-size:28px;margin-bottom:6px">Mission requirements verification</h2>
      <p class="muted" style="font-size:12.5px">${m === 'fire' ? `Orbit flown: <b style="color:#fff">${D.archInfo('fire', st.M.arch.id).short}</b>. ` : ''}${nMet} of 4 mandatory requirements met. They decide the outcome. Every value below was measured by the simulation during your flight. Click a row for the evidence.</p>
      ${v.gates.map((g, i) => rowHtml(g, i === firstMiss)).join('')}
      <div class="vr-tgt">${v.target ? rowHtml(v.target, firstMiss < 0 || v.target.status !== 'Met') : '<p class="muted" style="padding:12px 0;font-size:12.5px">No target was chosen for this flight: Not applicable.</p>'}</div>
      <p class="muted" style="font-size:12px;margin-top:8px">Your target is checked separately. It adds no points and cannot turn a missed mandatory requirement into a success. Its number is a teaching choice, not a NASA limit.</p>${chain(4)}</div>`; }
  function compareHtml(m) { const R = S.redo[m], st = MX[m].st(); if (!R || !st.record || st.attempt == null || st.attempt.n < 2) return '';
    const a = R.original, b = st.record, X = BX[m], sameCode = a.missionCode === b.missionCode, rows = D.compare(m, a.summary, b.summary);
    const parts = D.PARTS.filter(k => a.design[k] !== b.design[k]).map(k => `${X.label[k]}: ${X.name[k][a.design[k] === 'std' ? 0 : 1]} → <b>${X.name[k][b.design[k] === 'std' ? 0 : 1]}</b>`);
    const archCh = a.architecture && b.architecture && a.architecture.id !== b.architecture.id ? `Orbit: ${archName(a.architecture.id)} → <b>${archName(b.architecture.id)}</b>` : '';
    const decCh = JSON.stringify([a.decisions, a.manipulations]) !== JSON.stringify([b.decisions, b.manipulations]);
    const what = parts.concat(archCh ? [archCh] : []);
    const verdict = b.summary.score > a.summary.score ? 'scored higher than' : b.summary.score < a.summary.score ? 'scored lower than' : 'scored the same as';
    return `<div class="glass panel" id="comparePanel" style="margin-top:16px"><h2 style="font-size:28px;margin-bottom:6px">Original vs revised mission</h2>
      <p class="muted" style="font-size:12.5px">Both columns are full flights of the real simulation under Mission Code <b>${b.missionCode}</b>${sameCode ? ': the same outside events' : ' (WARNING: the codes differ, so this is not a fair comparison)'}.</p>
      <table class="xtab cmp"><tr><th></th><th>Original</th><th>Revised (attempt ${st.attempt.n})</th></tr>
      ${rows.map(r => `<tr><td>${r.label}</td><td>${r.a}</td><td class="${r.better > 0 ? 'up' : r.better < 0 ? 'down' : ''}"><b>${r.b}</b>${r.delta ? ` <span style="font-size:12px">(${r.delta > 0 ? '+' : ''}${r.delta})</span>` : ''}</td></tr>`).join('')}</table>
      <p class="cmp-note"><b style="color:#fff">What you changed:</b> ${what.join(' · ') || 'no part of the satellite'}. <b style="color:#fff">Decisions:</b> ${st.attempt.mode === 'same-decisions' ? 'replayed from your original flight' + (st.attempt.resets.length ? ', except: ' + st.attempt.resets.join(' ') : ' with nothing changed') : decCh ? 'you made new decisions this time' : 'identical to your original flight'}.</p>
      <p class="cmp-note">${what.length && !decCh ? `Only the design changed and the conditions were the same, so the difference is caused by your redesign: the revised mission ${verdict} the original.` : what.length && decCh ? 'The design and some decisions both changed, so you cannot tell which one caused the difference. To test the design alone, launch again and choose "Fly my earlier decisions".' : !decCh ? 'Same satellite, same decisions, same code: the simulation gives exactly the same result. That is what makes the comparison fair.' : 'Only your decisions changed.'}</p></div>`; }
  const archName = id => (typeof ARCH_UI !== 'undefined' && ARCH_UI[id]) ? ARCH_UI[id].name : id;
  function reportMount() { const m = missionOfScreen(); if (!m || S.screen !== MX[m].screens[2]) return; const col = document.querySelector('#app .report > div:last-child'); if (!col || document.getElementById('verifyPanel')) return;
    col.insertAdjacentHTML('afterbegin', verifyHtml(m) + compareHtml(m) + '<div style="height:16px"></div>'); }

  /* ================= 4. Improve My Mission: redesign and re-fly with the same Mission Code ================= */
  function startRedo(m) { const st = MX[m].st(); if (!st || !st.record) return;
    if (!S.redo[m] || S.redo[m].code !== S.scn[m].code) S.redo[m] = { code: S.scn[m].code, seed: S.scn[m].seed, mode: S.scnMode[m], original: clone(st.record), n: 1 };
    S.redo[m].pending = true; S.mdNote[m] = null; go(BUILD[m]);
    say('pip', `Your original flight is saved. Change the satellite, then launch again with the same Mission Code <b>${S.redo[m].code}</b>. Change one thing at a time if you want to know what caused the difference.`, { speak: false }); }
  function redoModal(m) { const R = S.redo[m], X = MX[m], c = D.carry(m, R.original, X.design(), archOf(m)); R.carry = c;
    const changed = c.hardwareChanged || c.architectureChanged;
    $('#layer').innerHTML = `<div class="modal-wrap"><div class="glass modal" style="max-width:640px;width:92vw" role="dialog" aria-label="Fly the revised mission"><div class="eyebrow" style="color:var(--good)">Revised mission · ${R.code}</div>
      <h2>Same conditions. How will you fly?</h2>
      <p>The Mission Code is the same, so every outside event happens exactly as before. ${changed ? 'Your satellite is different.' : 'Your satellite is the same as in the original flight.'}</p>
      ${c.resets.length ? `<div class="decide"><b>These earlier moves do not fit the new satellite and are reset:</b><ul style="padding-left:18px;margin-top:6px">${c.resets.map(r => `<li>${r}</li>`).join('')}</ul></div>` : `<div class="decide"><b>Fair test:</b> flying your earlier decisions changes only the satellite, so any difference in the result comes from your redesign.</div>`}
      <div class="acts"><button class="btn ghost" data-a="redoNew" data-m="${m}">Make new decisions</button><button class="btn good" data-a="redoSame" data-m="${m}">Fly my earlier decisions</button></div></div></div>`; }
  function autoFly(m) { const R = S.redo[m], X = MX[m], c = R.carry || D.carry(m, R.original, X.design(), archOf(m)); R.pending = false; R.n--;   // the launch already created (and counted) a mission state; this replaces it
    RESET[m](); const st = X.st(); st.attempt.mode = 'same-decisions'; st.attempt.resets = c.resets.slice();
    st.choice = c.decisions.map(d => d.slice()); st.M.ext = clone(c.manipulations); if (m === 'storm') st.ix = st.M.ext; else st.task = st.M.ext;
    for (let ci = 0; ci < 4; ci++) { st.ci = ci; X.sim(); }           // the same engine calls a hand-played mission makes, one challenge at a time
    st.phase = 'result'; st.delta = {}; $('#layer').innerHTML = ''; go(X.screens[2]); }

  // every new mission state carries its requirement and attempt info (engines ignore both)
  const RESET = {};
  const wrapReset = (m, f) => function () { f(); const st = MX[m].st(), R = S.redo[m];
    D.attach(st.M, m, S.target[m], archOf(m)); if (R) R.n++;
    st.attempt = R ? { n: R.n, basedOn: R.original.missionCode, mode: 'played', resets: [] } : { n: 1, basedOn: null, mode: 'played', resets: [] }; };
  resetOps = RESET.storm = wrapReset('storm', resetOps); resetF = RESET.fire = wrapReset('fire', resetF); resetL = RESET.flood = wrapReset('flood', resetL);
  const wrapAlert = (m, f) => function () { const R = S.redo[m], st = MX[m].st(); if (R && R.pending && st && st.ci === 0 && st.phase === 'alert') return redoModal(m); f(); };
  showAlert = wrapAlert('storm', showAlert); showFAlert = wrapAlert('fire', showFAlert); showLAlert = wrapAlert('flood', showLAlert);

  // while improving, the Mission Code cannot change
  const _scenarioCard = scenarioCard;
  scenarioCard = function (m) { const R = S.redo[m]; if (!R) return _scenarioCard(m);
    return `<div class="scn-card htp"><h4>Mission Code (locked)</h4><div class="htp-code"><span class="l">Same conditions as your original flight</span><span class="c">${R.code}</span></div><p class="htp-help" style="margin-top:8px">Same code, same simulated events. Only what you change can change the result.</p></div>`; };

  /* ================= wiring ================= */
  document.addEventListener('click', e => { const b = e.target.closest('[data-a]'); if (!b) return; const a = b.dataset.a;
    if (PART_ACT[a]) { const m = PART_ACT[a], d = BX[m].design(); if (d[b.dataset.k] !== b.dataset.v) S._mdBefore = { m, design: Object.assign({}, d), k: b.dataset.k, v: b.dataset.v }; }
    if (a === 'startMission' || a === 'fstart' || a === 'lstart') { const m = a === 'startMission' ? 'storm' : a === 'fstart' ? 'fire' : 'flood'; delete S.redo[m]; S.mdNote[m] = null; }
  }, true);
  document.addEventListener('click', e => { const b = e.target.closest('[data-a]'); if (!b) return; const a = b.dataset.a, m = b.dataset.m || S.mission;
    switch (a) {
      case 'pickTarget': S.target[S.mission] = b.dataset.t; S.mdNote[S.mission] = null; render(); { const f = document.querySelector(`.tg[data-t="${b.dataset.t}"]`); if (f) f.focus(); } break;
      case 'briefGo': if (S.target[S.mission]) go(BUILD[S.mission]); break;
      case 'changeTarget': S.mission = MOF[S.screen] || S.mission; go('brief'); break;
      case 'improve': startRedo(m); break;
      case 'pickArch': { const mm = 'fire', before = archOf(mm); if (before === b.dataset.v) break; S.arch[mm] = b.dataset.v;
        if (S.target[mm] && MOF[S.screen] === mm) { const n = D.changeNote(mm, BX[mm].design(), BX[mm].design(), S.target[mm], before, b.dataset.v); n.what = `Orbit → ${D.archInfo(mm, b.dataset.v).short}`; S.mdNote[mm] = n; } else S.mdNote[mm] = null;
        render(); { const f = document.querySelector(`.ar[data-v="${b.dataset.v}"]`); if (f) f.focus(); } break; }
      case 'redoCancel': delete S.redo[m]; S.mdNote[m] = null; render(); break;
      case 'redoNew': S.redo[m].pending = false; $('#layer').innerHTML = ''; ({ storm: showAlert, fire: showFAlert, flood: showLAlert })[m](); break;
      case 'redoSame': autoFly(m); break;
    } });
  const _render = render;
  render = function () { const pb = S._mdBefore; S._mdBefore = null;
    if (pb && S.target[pb.m]) { const X = BX[pb.m], n = D.changeNote(pb.m, pb.design, X.design(), S.target[pb.m], archOf(pb.m)); n.what = `${X.label[pb.k]} → ${X.name[pb.k][pb.v === 'std' ? 0 : 1]}`; S.mdNote[pb.m] = n; }
    syncFireScn(); _render(); builderMount(); reportMount(); };
  window.MDUI = { verifyHtml, compareHtml, startRedo, autoFly, redoModal, builderMount, reportMount };
  render();
})();
