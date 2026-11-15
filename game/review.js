/* Earth Missions v7.0 — Mission Readiness Review = Design Check + launch compatibility. Loaded after look.js.
 * v7.0: the checks themselves now live in mission-design.js (MissionDesign.designCheck), the single readiness logic.
 * This file only renders them. Risk formulas and thresholds are the v6.3 ones, unchanged (tested against the v6.3 file).
 * Status labels: Ready (check passes) · Caution (possible problem, launch allowed) · Not Ready (requirement not met, launch blocked).
 * Rollback: remove the review.js line from index.html.
 */
'use strict';
document.head.insertAdjacentHTML('beforeend', `<style>
.rv-st{font-weight:600;white-space:nowrap}.rv-st.ok{color:var(--good)}.rv-st.cau{color:var(--warn)}.rv-st.no{color:var(--bad)}
.rv-sum{margin-top:14px;padding:12px 14px;border-radius:12px;font-size:13.5px;line-height:1.5;border:1px solid}
.rv-sum+.acts{margin-top:16px}
.rv-sum b{display:block;font-size:14.5px;margin-bottom:2px}
.rv-sum.ok{border-color:#3ddc9755;background:#3ddc9712}.rv-sum.ok b{color:var(--good)}
.rv-sum.cau{border-color:#ffc85755;background:#ffc85712}.rv-sum.cau b{color:var(--warn)}
.rv-sum.no{border-color:#ff7a6b66;background:#ff7a6b14}.rv-sum.no b{color:var(--bad)}
</style>`);
const RV = { ok: ['ok', '✓', 'Ready'], cau: ['cau', '⚠', 'Caution'], no: ['no', '✕', 'Not Ready'] };
document.head.insertAdjacentHTML('beforeend', `<style>
.rv-h{margin:16px 0 2px;font-size:12px;letter-spacing:.14em;text-transform:uppercase;color:var(--dim);font-weight:600}
.rv-h span{letter-spacing:0;text-transform:none;font-weight:400;color:var(--muted)}
.rv-cause{display:block;margin-top:3px;font-size:12px;color:#ffd58a}
.rv-scope{margin-top:10px;font-size:12px;color:var(--muted);line-height:1.5}
.rv-tgt{margin-top:12px;padding:10px 14px;border-radius:12px;border:1px solid #5aa9ff55;background:#5aa9ff10;font-size:13px;line-height:1.5}
</style>`);
mrr = function (m) { const X = MX[m], D = MissionDesign, dc = D.designCheck(m, X.design(), archOf(m)), L = dc.launch;
  const tr = r => { const s = RV[r.st]; return `<tr><td>${r.label}</td><td><b>${r.val}</b></td><td class="rv-st ${s[0]}"><span aria-hidden="true">${s[1]}</span> ${s[2]}</td><td class="muted">${r.st === 'ok' ? r.note : `${r.risk}<span class="rv-cause">Cause: ${r.cause}</span>`}</td></tr>`; };
  const tbl = kind => `<div style="overflow:auto"><table class="xtab"><tr><th>Check</th><th>Your design</th><th>Status</th><th>Why it matters</th></tr>${dc.rows.filter(r => r.kind === kind).map(tr).join('')}</table></div>`;
  const sum = dc.summary, tid = (S.target || {})[m], t = D.targetDef(m, tid), arch = m === 'fire' && typeof archLabel === 'function' ? archLabel() : '';
  $('#layer').innerHTML = `<div class="modal-wrap"><div class="glass modal" style="max-width:900px;width:94vw;max-height:92vh;overflow:auto" role="dialog" aria-label="Mission Readiness Review"><div class="eyebrow">Mission Readiness Review · ${X.name}</div>
    <h2>Design Check</h2>
    <p class="rv-h">1 · Can it fly? <span>Hard limits. One "Not Ready" blocks the launch.</span></p>${tbl('feasibility')}
    <p class="rv-scope"><b style="color:#fff">Launch:</b> ${L.profile.name} to ${L.profile.orbit}${arch ? ` (${arch})` : ''}. ${L.ok ? `${L.marginKg.toLocaleString()} kg of margin.` : ''} ${L.profile.note} ${D.LAUNCH_COST_NOTE}</p>
    <p class="rv-h">2 · Where are the risks? <span>Your design can fly, but plan around every Caution.</span></p>${tbl('risk')}
    <p class="rv-h">3 · For reference</p>${tbl('info')}
    <div class="rv-tgt"><b>What the mission must do:</b> ${D.GATES[m].map(g => g.threshold).join('; ')}.${t ? `<br><b>Your target:</b> ${t.statement} <span class="muted">(${t.unit})</span>` : ''}</div>
    <div class="rv-sum ${sum[0]}" role="status"><b>${sum[1]}</b>${sum[2]}</div>
    <p class="rv-scope">${dc.scope} Mission Code: <b>${S.scn[m].code}</b>.</p>
    <div class="acts"><button class="btn ghost" data-a="mrrBack">Back to design</button><button class="btn good" data-a="goLaunch" data-m="${m}" ${dc.canLaunch ? '' : 'disabled aria-disabled="true"'}>Go for launch</button></div></div></div>`; };
