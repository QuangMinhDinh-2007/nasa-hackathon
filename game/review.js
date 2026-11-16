/* Earth Missions v7.1 — Mission Readiness Review, redesigned for a quick, plain-language read.
 * All calculations come from MissionDesign.designCheck (mission-design.js) and GATES; this file only
 * renders them, in this fixed order: 1 Ready to Launch?, 2 Mission Goals, 3 Checks Passed,
 * 4 Things to Watch, 5 View Engineering Details (collapsed), 6 Actions.
 * Status labels: Ready (check passes) · Caution (possible problem, launch allowed) · Not Ready (requirement not met, launch blocked).
 * Rollback: remove the review.js line from index.html; v6.3's table layout returns automatically
 * (mrr falls back to whatever the previous script defined, since this file is the only one that sets it).
 */
'use strict';
document.head.insertAdjacentHTML('beforeend', `<style>
.rv-st{font-weight:600;white-space:nowrap}.rv-st.ok{color:var(--good)}.rv-st.cau{color:var(--warn)}.rv-st.no{color:var(--bad)}
.rv-h{margin:18px 0 2px;font-size:12px;letter-spacing:.14em;text-transform:uppercase;color:var(--dim);font-weight:600}
.rv-h span{letter-spacing:0;text-transform:none;font-weight:400;color:var(--muted)}
.rv-cause{display:block;margin-top:3px;font-size:12px;color:#ffd58a}
.rv-scope{margin-top:10px;font-size:12px;color:var(--muted);line-height:1.5}
/* 1 · Ready to Launch? hero */
.rv-hero{display:flex;align-items:flex-start;gap:14px;padding:16px 18px;border-radius:14px;border:1px solid;margin-top:4px}
.rv-hero .ic{width:36px;height:36px;border-radius:50%;display:grid;place-items:center;font-size:18px;font-weight:800;flex:none}
.rv-hero b{display:block;font-family:Anton,Impact,sans-serif;font-weight:400;font-size:22px;text-transform:uppercase;letter-spacing:.01em;margin-bottom:3px}
.rv-hero p{font-size:13px;color:var(--muted);margin:0}
.rv-hero.ok{border-color:#3ddc9755;background:#3ddc9712}.rv-hero.ok .ic{background:var(--good);color:#032015}.rv-hero.ok b{color:var(--good)}
.rv-hero.cau{border-color:#ffc85755;background:#ffc85712}.rv-hero.cau .ic{background:var(--warn);color:#2a1d00}.rv-hero.cau b{color:var(--warn)}
.rv-hero.no{border-color:#ff7a6b66;background:#ff7a6b14}.rv-hero.no .ic{background:var(--bad);color:#2a0905}.rv-hero.no b{color:var(--bad)}
/* 2 · Mission Goals */
.rv-goals{list-style:none;margin:8px 0 0;padding:0;display:grid;gap:7px}
.rv-goals li{display:flex;align-items:flex-start;gap:10px;font-size:13.5px;line-height:1.4;padding:9px 12px;border-radius:12px;background:rgba(0,0,0,.25);border:1px solid var(--line)}
.rv-goals li i{flex:none;width:20px;height:20px;border-radius:50%;background:#5aa9ff22;color:var(--blue);display:grid;place-items:center;font-style:normal;font-size:11px;font-weight:700}
.rv-tgt{margin-top:10px;padding:10px 14px;border-radius:12px;border:1px solid #5aa9ff55;background:#5aa9ff10;font-size:12.5px;line-height:1.5}
/* 3 · Checks Passed — compact chips */
.rv-chips{display:flex;flex-wrap:wrap;gap:8px;margin-top:8px}
.rv-chip{display:flex;align-items:center;gap:7px;padding:8px 12px;border-radius:10px;background:rgba(0,0,0,.25);border:1px solid var(--line);font-size:12.5px}
.rv-chip .dot{width:9px;height:9px;border-radius:50%;flex:none}
.rv-chip.ok .dot{background:var(--good)}.rv-chip.no .dot{background:var(--bad)}
.rv-chip b{font-weight:600}
.rv-facts{margin-top:8px;font-size:12px;color:var(--muted);line-height:1.6}
/* 4 · Things to Watch */
.rv-cau-grid{display:grid;gap:8px;margin-top:8px}
.rv-cau-card{display:flex;gap:10px;padding:10px 14px;border-radius:12px;background:#ffc85712;border:1px solid #ffc85744}
.rv-cau-card .ic{flex:none;font-size:16px;line-height:1.3}
.rv-cau-card b{display:block;font-size:13px;margin-bottom:2px;color:var(--warn)}
.rv-cau-card p{margin:0;font-size:12.5px;color:var(--muted);line-height:1.5}
.rv-none{margin-top:8px;font-size:13px;color:var(--good)}
/* 5 · Engineering Details */
.rv-details{margin-top:18px}
.rv-details summary{cursor:pointer;font-size:12.5px;font-weight:600;color:var(--blue);list-style:none;padding:4px 0}
.rv-details summary::-webkit-details-marker{display:none}
.rv-details summary::before{content:'▸ '}
.rv-details[open] summary::before{content:'▾ '}
.rv-details .inner{margin-top:10px}
/* Storm Watch: goal-focused popup (empty circles; the live checklist is in the Operate sidebar) */
.rv-cl{list-style:none;margin:8px 0 0;padding:0;display:grid;gap:8px}
.rv-cl li{display:flex;align-items:center;gap:10px;font-size:13.5px;line-height:1.4}
.rv-cl .o{flex:none;width:18px;height:18px;border-radius:50%;border:1.5px solid var(--line2)}
.rv-cau-1{display:flex;align-items:flex-start;gap:9px;padding:10px 14px;border-radius:12px;background:#ffc85712;border:1px solid #ffc85744;font-size:13px;color:var(--muted);margin-top:8px}
.rv-cau-1 b{color:var(--warn)}
.rv-sumline{margin-top:8px;font-size:13px;color:var(--good)}
.rv-pass{display:flex;align-items:center;gap:10px;margin:4px 0 2px;padding:10px 14px;border-radius:14px;background:#3ddc9722;border:2px solid var(--good);color:var(--good);font-size:16px;font-weight:700}
.rv-pass span{display:grid;place-items:center;width:24px;height:24px;border-radius:50%;background:var(--good);color:#032015;font-size:14px}
.rv-block{margin:4px 0 2px;padding:12px 16px;border-radius:14px;background:#ff7a6b1f;border:2px solid var(--bad);color:#fff;font-size:15px}
.rv-block b{color:var(--bad)}.rv-block ul{margin:6px 0 0 18px}.rv-block li{margin-top:4px;line-height:1.45}.rv-block li b{color:#fff}
.rv-one{margin-top:6px;font-size:15px;line-height:1.45}.rv-watch{color:#ffe2a0}
.rv-flag{flex:none;width:22px;height:22px;color:#fff6e6;pointer-events:none}.rv-flag svg{width:100%;height:100%;display:block}
.rv-more{margin:4px 0 0 18px;font-size:12.5px;color:var(--muted);line-height:1.5}
.modal .rv-h{margin-top:16px;font-size:12.5px}.modal .rv-cl li{font-size:15px}
</style>`);
const RV = { ok: ['ok', '✓', 'Ready'], cau: ['cau', '⚠', 'Caution'], no: ['no', '✕', 'Not Ready'] };

/* Short, plain-language mission goals. Numbers mirror MissionDesign.GATES[m] (the engines' own gates);
 * kept as plain text here (not parsed from the gate sentences) so the wording stays short and the order
 * matches the student-facing spec: coverage/alert, science points, critical/final update, power. */
const RV_GOALS = {
  storm: ['Observe the storm in at least 3 of 4 phases', 'Deliver 12 science points to Earth', 'Send a late storm image before the deadline', 'Keep your satellite powered'],
  fire: ['Warn about a new hotspot within 2 hours of detecting it.', 'Deliver at least 3 science points.', 'Deliver a final fire image by the end of the mission.', 'Keep the satellite powered.'],
  flood: ['Map all 3 zones of the valley.', 'Deliver at least 5 map points.', 'Deliver a fresh map of the town by the end.', 'Keep the satellite powered.'],
};
/* Short caution label by row key, for the single-caution popup line, across all three missions. The
 * sentence itself is still the engine's own dc row .risk text; this only supplies the short lead-in. */
const RV_CAU_LABEL = { flow: 'Watch your data link', storage: 'Watch your storage', battery: 'Watch your battery', fault: 'Watch your battery', detect: 'Watch your detection strength', passes: 'Watch your usable passes' };

mrr = function (m) { const X = MX[m], D = MissionDesign, dc = D.designCheck(m, X.design(), archOf(m)), L = dc.launch;
  const sum = dc.summary, tid = (S.target || {})[m], t = D.targetDef(m, tid), arch = m === 'fire' && typeof archLabel === 'function' ? archLabel() : '';
  const feas = dc.rows.filter(r => r.kind === 'feasibility'), risk = dc.cautions, info = dc.rows.filter(r => r.kind === 'info');
  const launchLine = `${L.profile.name} to ${L.profile.orbit}${arch ? ` (${arch})` : ''}${L.ok ? `, ${L.marginKg.toLocaleString()} kg of margin.` : '.'}`;

  // Main screen, all three missions, in this order: heading, one status line, goals (empty circles; they tick live
  // in the Operate sidebar once flying), bonus goal, the single most important caution. Everything else is in details.
  const ok = dc.canLaunch, top = risk[0];
  const blockers = feas.filter(r => r.st === 'no').map(r => `<li><b>${r.label}:</b> ${r.risk}</li>`);
  if (!L.ok) blockers.push(`<li><b>Rocket:</b> the satellite is too heavy for the launch vehicle.</li>`);
  const status = ok
    ? `<p class="rv-pass"><span aria-hidden="true">✓</span> Your satellite passed all launch checks.</p>`
    : `<div class="rv-block" role="alert"><b>Launch is blocked. Fix this first:</b><ul>${blockers.length ? blockers.join('') : `<li>${sum[2]}</li>`}</ul></div>`;
  const goals = `<p class="rv-h">Your Mission Goals</p><ul class="rv-cl">${RV_GOALS[m].map(g => `<li><span class="rv-flag" aria-hidden="true"><svg viewBox="0 0 20 20"><path d="M5 2.5v15" stroke="currentColor" stroke-width="2" stroke-linecap="round"/><path d="M6 3.5h9l-2.2 3.2L15 10H6z" fill="#ffd166" stroke="#4a3b63" stroke-width="1.4" stroke-linejoin="round"/></svg></span><span>${g}</span></li>`).join('')}</ul>`;
  const bonus = t ? `<p class="rv-h">Bonus Goal</p><p class="rv-one"><b>${t.title}:</b> ${t.statement}</p>` : '';
  const caution = ok && top ? `<p class="rv-h">Watch Out</p><p class="rv-one rv-watch"><span aria-hidden="true">⚠</span> ${top.risk}</p>` : '';
  const body = `<h2>${ok ? 'Ready to Launch!' : 'Not Ready to Launch'}</h2>${status}${goals}${bonus}${caution}`;

  // View Engineering Details — the full table, formulas, causes, launch margin and scope note, collapsed for every mission
  const tr = r => `<tr><td>${r.label}</td><td><b>${r.val}</b></td><td class="rv-st ${RV[r.st][0]}"><span aria-hidden="true">${RV[r.st][1]}</span> ${RV[r.st][2]}</td><td class="muted">${r.st === 'ok' ? r.note : `${r.risk}<span class="rv-cause">Cause: ${r.cause}</span>`}</td></tr>`;
  const tbl = rows => `<div style="overflow:auto"><table class="xtab"><tr><th>Check</th><th>Your design</th><th>Status</th><th>Why it matters</th></tr>${rows.map(tr).join('')}</table></div>`;
  const details = `<details class="rv-details"><summary>View Engineering Details</summary><div class="inner">
    <p class="rv-scope"><b style="color:#fff">Check summary:</b> ${sum[1]}. ${sum[2]}</p>
    ${risk.length > 1 ? `<p class="rv-scope"><b style="color:#fff">Other cautions:</b></p><ul class="rv-more">${risk.slice(1).map(r => `<li><b>${RV_CAU_LABEL[r.key] || r.label}:</b> ${r.risk}</li>`).join('')}</ul>` : ''}
    ${t ? `<p class="rv-scope"><b style="color:#fff">Bonus goal measured as:</b> ${t.definition} (${t.unit})</p>` : ''}
    <p class="rv-scope"><b style="color:#fff">Launch:</b> ${L.profile.name} to ${L.profile.orbit}${arch ? ` (${arch})` : ''}. ${L.ok ? `${L.marginKg.toLocaleString()} kg of margin.` : ''} ${L.profile.note} ${D.LAUNCH_COST_NOTE}</p>
    ${tbl(feas)}${tbl(dc.rows.filter(r => r.kind === 'risk'))}${tbl(info)}
    <div class="rv-tgt"><b>What the mission must do:</b> ${D.GATES[m].map(g => g.threshold).join('; ')}.</div>
    <p class="rv-scope">${dc.scope} Mission Code: <b>${S.scn[m].code}</b>.</p></div></details>`;

  $('#layer').innerHTML = `<div class="modal-wrap"><div class="glass modal" style="max-width:900px;width:94vw;max-height:92vh;overflow:auto" role="dialog" aria-label="Mission Readiness Review, ${X.name}">${body}${details}
    <div class="acts" style="margin-top:18px"><button class="btn ghost" data-a="mrrBack">Change Design</button><button class="btn good" data-a="goLaunch" data-m="${m}" ${dc.canLaunch ? '' : 'disabled aria-disabled="true"'}>Launch Mission</button></div></div></div>`; };
