/* report-ff.js — Wildfire Watch and Flood Watch final reports, ported from Storm's
 * compact one-screen report.js pattern (same .cr-* layout/CSS, loaded by report.js).
 * Uses the engines' own gates/score (WF.score/FL.score), each mission's own CH array
 * (CHF/LCH), and the same crBestChange/crPickLine/crBreakdownModal helpers report.js
 * already defines. No engine, score, or gate logic touched; this file only changes
 * what the Final Report screen displays for these two missions.
 * Drops, same as Storm's report.js: Wildfire's "What was really burning" reveal map
 * and the full Mission Analysis essay, badges, full change-one-thing table, timeline,
 * and mission record (reportExtras' side effects for st.record/XP still run via
 * patchPanel(m), just not rendered here).
 * Rollback: remove the report-ff.js line from index.html; the old V.freport/V.lreport
 * in index.html (not removed, just overridden) take over again automatically.
 */
'use strict';

function ffReportBody(m, nav2) {
  const X = MX[m], o = X.st(), M = o.M, sc = X.eng.score(M), x = m === 'fire' ? fD() : lD();
  const chip = sc.outcome === 'Mission Success' ? 'good' : sc.outcome === 'Partial Success' ? 'warn' : 'bad';
  const req = m === 'fire'
    ? [[`Delivered science ≥ ${WC.requiredScience} pts`, sc.gates.G1, `${fmt(x.deliveredScience)} / ${WC.requiredScience}`], ['New-hotspot alert within 2 h', sc.gates.G2, x.critStatus], [`Final update: a ${pT(3)} image delivered by 24:00`, sc.gates.G3, x.finalStatus], ['Essential systems running', sc.gates.G4, x.health + '% health']]
    : [[`Delivered maps ≥ ${LC.requiredMaps} pts`, sc.gates.G1, `${fmt(x.delivered)} / ${LC.requiredMaps}`], ['All 3 zones mapped', sc.gates.G2, `${x.coveredZones} / 3`], ['Fresh town map delivered', sc.gates.G3, x.townStatus], ['Essential systems running', sc.gates.G4, x.health + '% health']];
  const CH_ = m === 'fire' ? CHF : LCH;
  patchPanel(m); // side effect only: records the patch and grants XP, same as before
  const par = parScore(m), stars = sc.outcome === 'Mission Failure' ? 0 : sc.outcome !== 'Mission Success' ? 1 : sc.total >= par - 3 ? 3 : 2;
  const patch = { m, code: S.scn[m].code, stars, score: sc.total };
  const { best } = crBestChange(m);
  const tryHtml = best && best.dv > 0
    ? `<p class="r1">Try: ${best.lab}</p><p class="r2">Predicted score: ${best.total}/100 (+${best.dv})</p><p class="scope">Replay result with this satellite and Mission Code. Other Mission Codes may differ.</p>`
    : `<p class="r1">No single change scores higher with this satellite and Mission Code.</p><p class="scope" style="margin-top:8px">Try a different Mission Code, or change two decisions at once and compare.</p>`;
  const goalsDone = req.filter(r => r[1]).length;
  return `<div class="screen">${nav2}<div class="cr-wrap"><div class="cr">
   <div class="cr-left">
    <div class="glass cr-hero ${chip}">
     <div class="out">${sc.outcome === 'Mission Success' ? 'Mission Success' : sc.outcome === 'Partial Success' ? 'Partial Success' : 'Mission Failed'}</div>
     <div class="cr-sc">${sc.total}<small>/100</small></div>
     <div class="cr-bar"><i style="width:${sc.total}%"></i></div>
     <div class="cr-patch">${patchSvg(patch, 92)}<span aria-label="${stars} of 3 stars">${'★'.repeat(stars)}${'☆'.repeat(3 - stars)}</span></div>
    </div>
    <div class="glass cr-panel"><h3>Mission Goals <span class="cnt">${goalsDone} / 4</span></h3><div class="cr-goals">${req.map((r, i) => `<div class="cr-g ${r[1] ? 'y' : 'n'}"><i>${r[1] ? '✓' : '✕'}</i><span>${r[0]}${i === 3 && r[2] ? ` (${r[2]})` : ''}</span></div>`).join('')}</div></div>
   </div>
   <div class="cr-right">
    <div class="glass cr-panel cr-decs-panel"><h3>Your Decisions</h3><div class="cr-decs">${o.log.map((L, i) => `<div class="cr-dec"><b>${i + 1}. ${CH_[i].title}</b><span class="ch">${L.choices}</span><p>${crPickLine(L.good, L.trade)}</p></div>`).join('')}</div></div>
    <div class="glass cr-panel cr-try"><h3>Try Changing One Thing</h3>${tryHtml}</div>
    <div class="glass cr-panel"><button class="cr-bd-btn" data-a="crBreakdown" data-m="${m}">How was my score calculated? ▸</button></div>
   </div>
  </div>
  <div class="acts-row" style="margin-top:12px"><button class="btn blue" data-a="${m === 'fire' ? 'fretry' : 'lretry'}">Try Again</button><button class="btn primary" data-a="go" data-to="missions">Next Mission →</button></div>
  </div></div>`;
}

V.freport = () => ffReportBody('fire', nav(3, 'Wildfire Watch', 'Earth · Mission 2'));
V.lreport = () => ffReportBody('flood', nav(3, 'Flood Watch', 'Earth · Mission 3'));
