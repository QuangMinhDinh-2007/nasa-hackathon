/* report.js — Storm Watch Final Mission Report, one full-height, no-clutter screen.
 * Replaces V.report (index.html) only. Fire/Flood reports are untouched.
 * Uses only existing, already-computed data: scoreCard() (index.html), replayRun/chx
 * (upgrade.js), patchSvg/parScore (fun.js), SCORE_TEXT (final.js). No engine, score
 * formula, gate, or replay logic is touched — this file only changes what is displayed.
 * Old sections (Mission Requirements Verification table, Mission Analysis essay,
 * Badges, full Change-One-Thing table, separate Cause-and-Effect Timeline, Mission
 * Record, long scoring tables) are simply not rendered by the new V.report; their
 * code (reportExtras, badges, scorePanel, quizPanel in upgrade.js/final.js) still runs
 * for side effects it owns (recording st.record/S.last, patch XP) but is never
 * inserted into the DOM for this screen, since fun.js/final.js's render() hooks only
 * attach when they find specific old h2 text, which this screen no longer has.
 * Rollback: remove the report.js line from index.html; the old two-column V.report
 * in index.html (not removed, just overridden) takes over again automatically.
 */
'use strict';
document.head.insertAdjacentHTML('beforeend', `<style>
.cr-wrap{display:flex;flex-direction:column;min-height:clamp(480px,78vh,760px)}
.cr{display:grid;grid-template-columns:minmax(280px,38%) 1fr;gap:14px;flex:1;align-items:stretch}
.cr-left,.cr-right{display:flex;flex-direction:column;gap:12px}
.cr-hero{display:flex;flex-direction:column;align-items:center;text-align:center;padding:clamp(16px,3vh,24px) 20px;gap:8px;position:relative;overflow:hidden;min-height:clamp(260px,34vh,360px);background:linear-gradient(180deg,#0003,#000c 70%,#000e),var(--img-half) center/cover;justify-content:center}
.cr-hero .out{font-family:Anton,Impact,sans-serif;font-weight:400;font-size:clamp(20px,2.4vw,26px);text-transform:uppercase;letter-spacing:.02em;text-shadow:0 2px 10px #000}
.cr-hero.good .out{color:var(--good)}.cr-hero.warn .out{color:var(--warn)}.cr-hero.bad .out{color:var(--bad)}
.cr-sc{font-size:clamp(80px,9vw,100px);font-weight:800;line-height:.9;text-shadow:0 2px 14px #000}.cr-sc small{font-size:clamp(18px,2vw,22px);color:#ffffffcc;font-weight:600}
.cr-bar{width:85%;height:12px;border-radius:7px;background:#ffffff26;overflow:hidden;margin-top:8px}
.cr-bar i{display:block;height:100%;border-radius:inherit}
.cr-hero.good .cr-bar i{background:var(--good)}.cr-hero.warn .cr-bar i{background:var(--warn)}.cr-hero.bad .cr-bar i{background:var(--bad)}
.cr-patch{display:flex;flex-direction:column;align-items:center;gap:4px;margin-top:12px}
.cr-patch span{font-size:16px;color:#ffcc66;letter-spacing:2px;text-shadow:0 1px 6px #000}
.cr-panel{padding:14px 18px}
.cr-panel h3{margin:0 0 12px;font-size:clamp(20px,2.2vw,24px);font-weight:700;color:#fff;display:flex;align-items:baseline;gap:8px}
.cr-panel h3 .cnt{font-size:14px;color:var(--muted);font-weight:500}
.cr-goals{display:grid;grid-template-columns:1fr 1fr;gap:8px;flex:1;align-content:center}
.cr-g{display:flex;align-items:flex-start;gap:10px;font-size:15px;line-height:1.4;padding:10px 12px;border-radius:10px;background:rgba(0,0,0,.25)}
.cr-g i{flex:none;width:22px;height:22px;border-radius:50%;display:grid;place-items:center;font-style:normal;font-size:13px;font-weight:700;color:#000;margin-top:1px}
.cr-g.y i{background:var(--good)}.cr-g.n i{background:var(--bad)}
.cr-left .cr-panel{flex:1;display:flex;flex-direction:column}
.cr-right .cr-panel.cr-decs-panel{flex:2;display:flex;flex-direction:column}
.cr-decs{display:grid;gap:9px;flex:1;align-content:center}
.cr-dec{display:grid;grid-template-columns:200px 1fr;gap:12px;align-items:baseline;font-size:15px;padding:11px 16px;border-radius:12px;background:rgba(0,0,0,.25);line-height:1.4}
.cr-dec b{font-size:17px}.cr-dec .ch{color:#cfd8ea;font-size:15px}.cr-dec p{grid-column:1/3;margin:4px 0 0;color:var(--muted);font-size:15px}
.cr-try{border:1px solid #5aa9ff55;background:#5aa9ff14}
.cr-try .r1{margin:0;font-size:18px;font-weight:700;color:#fff}
.cr-try .r2{margin-top:8px;color:var(--good);font-size:26px;font-weight:800}
.cr-try .scope{margin-top:8px;font-size:14px;color:var(--muted)}
.cr-bd-btn{align-self:flex-start;background:none;border:none;padding:4px 0;color:var(--blue);font-size:15px;font-weight:600;cursor:pointer}
.cr-bd-row{display:flex;justify-content:space-between;gap:14px;font-size:15px;padding:10px 0;border-bottom:1px solid #ffffff14;line-height:1.4}
.cr-bd-row b{color:#fff;flex:none;min-width:150px}.cr-bd-row span{color:var(--muted);flex:1;text-align:right}
.acts-row .btn{font-size:16px}
@media(max-width:820px){.cr-wrap{min-height:auto}.cr{grid-template-columns:1fr}.cr-goals{grid-template-columns:1fr}.cr-dec{grid-template-columns:1fr}.cr-dec p{grid-column:auto}.cr-hero{min-height:260px}.cr-sc{font-size:60px}}
</style>`);

/* Pick the clearest consequence sentence from the engine-written good/trade text,
 * skipping sentences that only report a literal zero (e.g. "Imaging used 0 kWh"),
 * which read as noise rather than a consequence. Never invents text. */
const CR_ZERO = /\b0(\.0+)?\s*(kWh|GB|pts?|%)?\b.*?(used|→|->)|(\bused|→|->)\s*0(\.0+)?\s*(kWh|GB|pts?|%)?\b/i;
function crSentences(s) { return (s || '').split(/(?<=\.)\s+/).map(x => x.trim()).filter(Boolean); }
function crPickLine(good, trade) {
  const cand = crSentences(trade).concat(crSentences(good)).filter(x => !CR_ZERO.test(x));
  return cand[0] || crSentences(trade)[0] || crSentences(good)[0] || '';
}

function crBestChange(m) {
  const X = MX[m], st = X.st(), M = st.M, sc = X.eng.score(M), d = Object.assign({}, X.design()), dec = st.choice.map(c => c.slice());
  let best = null;
  X.CH.forEach((ch0, ci) => chx(m, ci).groups.forEach((g, gi) => {
    const alt = g.opts.find(o => o[0] !== dec[ci][gi]); const d2 = dec.map(c => c.slice()); d2[ci][gi] = alt[0];
    const r = replayRun(m, { design: d, decisions: d2, scn: S.scn[m] }).s; const dv = r.total - sc.total;
    if (!best || dv > best.dv) best = { dv, ci, lab: alt[1], total: r.total };
  }));
  return { best, total: sc.total };
}

function crBreakdownModal() {
  const s = scoreCard(), T = SCORE_TEXT.storm, pts = [s.sci, s.tim, s.res, s.rel], max = [35, 35, 20, 10];
  $('#layer').innerHTML = `<div class="modal-wrap"><div class="glass modal" style="max-width:640px;width:92vw" role="dialog" aria-label="How your score was calculated">
   <div class="eyebrow">Score breakdown</div><h2>How was my score calculated?</h2>
   ${T.names.map((n, i) => `<div class="cr-bd-row"><b>${n}: ${pts[i].toFixed(1)} / ${max[i]}</b><span>${T.how[i]}</span></div>`).join('')}
   <div class="acts" style="margin-top:16px"><button class="btn blue" data-a="closeLayer">Close</button></div></div></div>`;
}
document.addEventListener('click', e => { if (e.target.closest('[data-a="crBreakdown"]')) crBreakdownModal(); });

V.report = () => {
  const o = S.ops, s = scoreCard(), chip = s.outcome === 'Mission Success' ? 'good' : s.outcome === 'Partial Success' ? 'warn' : 'bad';
  patchPanel('storm'); // side effect only: records the patch and grants XP, same as before
  const sc = s.sc, par = parScore('storm'), stars = sc.outcome === 'Mission Failure' ? 0 : sc.outcome !== 'Mission Success' ? 1 : sc.total >= par - 3 ? 3 : 2;
  const patch = { m: 'storm', code: S.scn.storm.code, stars, score: sc.total };
  const { best } = crBestChange('storm');
  const tryHtml = best && best.dv > 0
    ? `<p class="r1">Try: ${best.lab}</p><p class="r2">Predicted score: ${best.total}/100 (+${best.dv})</p><p class="scope">Replay result with this satellite and Mission Code. Other Mission Codes may differ.</p>`
    : `<p class="r1">No single change scores higher with this satellite and Mission Code.</p><p class="scope" style="margin-top:8px">Try a different Mission Code, or change two decisions at once and compare.</p>`;
  const goalsDone = s.req.filter(r => r[1]).length;
  return `<div class="screen">${nav(3)}<div class="cr-wrap"><div class="cr">
   <div class="cr-left">
    <div class="glass cr-hero ${chip}">
     <div class="out">${s.outcome === 'Mission Success' ? 'Mission Success' : s.outcome === 'Partial Success' ? 'Partial Success' : 'Mission Failed'}</div>
     <div class="cr-sc">${s.total}<small>/100</small></div>
     <div class="cr-bar"><i style="width:${s.total}%"></i></div>
     <div class="cr-patch">${patchSvg(patch, 92)}<span aria-label="${stars} of 3 stars">${'★'.repeat(stars)}${'☆'.repeat(3 - stars)}</span></div>
    </div>
    <div class="glass cr-panel"><h3>Mission Goals <span class="cnt">${goalsDone} / 4</span></h3><div class="cr-goals">${s.req.map(r => `<div class="cr-g ${r[1] ? 'y' : 'n'}"><i>${r[1] ? '✓' : '✕'}</i><span>${r[0]}</span></div>`).join('')}</div></div>
   </div>
   <div class="cr-right">
    <div class="glass cr-panel cr-decs-panel"><h3>Your Decisions</h3><div class="cr-decs">${o.log.map((L, i) => `<div class="cr-dec"><b>${i + 1}. ${CH[i].title}</b><span class="ch">${L.choices}</span><p>${crPickLine(L.good, L.trade)}</p></div>`).join('')}</div></div>
    <div class="glass cr-panel cr-try"><h3>Try Changing One Thing</h3>${tryHtml}</div>
    <div class="glass cr-panel"><button class="cr-bd-btn" data-a="crBreakdown">How was my score calculated? ▸</button></div>
   </div>
  </div>
  <div class="acts-row" style="margin-top:12px"><button class="btn blue" data-a="retry">Try Again</button><button class="btn primary" data-a="nextMission">Next Mission →</button></div>
  </div></div>`;
};
