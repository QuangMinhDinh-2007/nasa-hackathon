/* report.js — Storm Watch Final Mission Report, compacted to one no-scroll screen.
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
.cr{display:grid;grid-template-columns:260px 1fr;gap:14px;align-items:start}
.cr-hero{display:flex;flex-direction:column;align-items:center;text-align:center;padding:18px 14px;gap:8px}
.cr-hero .out{font-family:Anton,Impact,sans-serif;font-weight:400;font-size:18px;text-transform:uppercase}
.cr-hero.good .out{color:var(--good)}.cr-hero.warn .out{color:var(--warn)}.cr-hero.bad .out{color:var(--bad)}
.cr-sc{font-size:46px;font-weight:800;line-height:1}.cr-sc small{font-size:16px;color:var(--muted);font-weight:600}
.cr-bar{width:100%;height:8px;border-radius:5px;background:#ffffff18;overflow:hidden}
.cr-bar i{display:block;height:100%;border-radius:inherit}
.cr-hero.good .cr-bar i{background:var(--good)}.cr-hero.warn .cr-bar i{background:var(--warn)}.cr-hero.bad .cr-bar i{background:var(--bad)}
.cr-patch{display:flex;flex-direction:column;align-items:center;gap:2px;margin-top:4px}
.cr-patch span{font-size:13px;color:#ffcc66;letter-spacing:2px}
.cr-panel{padding:14px 16px}
.cr-panel h3{margin:0 0 8px;font-size:13px;letter-spacing:.08em;text-transform:uppercase;color:var(--dim)}
.cr-goals{display:grid;grid-template-columns:1fr 1fr;gap:6px}
.cr-g{display:flex;align-items:flex-start;gap:7px;font-size:12.5px;line-height:1.35;padding:6px 8px;border-radius:9px;background:rgba(0,0,0,.25)}
.cr-g i{flex:none;width:16px;height:16px;border-radius:50%;display:grid;place-items:center;font-style:normal;font-size:10px;font-weight:700;color:#000}
.cr-g.y i{background:var(--good)}.cr-g.n i{background:var(--bad)}
.cr-decs{display:grid;gap:7px}
.cr-dec{display:grid;grid-template-columns:150px 1fr;gap:8px;align-items:baseline;font-size:12.5px;padding:7px 9px;border-radius:9px;background:rgba(0,0,0,.25)}
.cr-dec b{font-size:12px}.cr-dec span{color:#cfd8ea}.cr-dec p{grid-column:1/3;margin:2px 0 0;color:var(--muted)}
.cr-try p{margin:0;font-size:13px}.cr-try .r1{font-weight:600;color:#fff}.cr-try .r2{margin-top:4px;color:var(--good);font-size:14px;font-weight:700}
.cr-try .scope{margin-top:6px;font-size:11.5px;color:var(--dim)}
.cr-breakdown{margin-top:2px}
.cr-breakdown summary{cursor:pointer;font-size:12.5px;font-weight:600;color:var(--blue);list-style:none;padding:4px 0}
.cr-breakdown summary::-webkit-details-marker{display:none}
.cr-breakdown summary::before{content:'▸ '}.cr-breakdown[open] summary::before{content:'▾ '}
.cr-bd-row{display:flex;justify-content:space-between;gap:10px;font-size:12.5px;padding:4px 0;border-bottom:1px solid #ffffff14}
.cr-bd-row b{color:#fff}.cr-bd-row span{color:var(--muted);flex:1;text-align:right}
@media(max-width:820px){.cr{grid-template-columns:1fr}.cr-goals{grid-template-columns:1fr}.cr-dec{grid-template-columns:1fr}.cr-dec p{grid-column:auto}}
</style>`);

function crOneLine(s) { if (!s) return ''; const m = s.match(/^[^.]*\./); return (m ? m[0] : s).trim(); }

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

V.report = () => {
  const o = S.ops, s = scoreCard(), chip = s.outcome === 'Mission Success' ? 'good' : s.outcome === 'Partial Success' ? 'warn' : 'bad';
  patchPanel('storm'); // side effect only: records the patch and grants XP, same as before
  const sc = s.sc, par = parScore('storm'), stars = sc.outcome === 'Mission Failure' ? 0 : sc.outcome !== 'Mission Success' ? 1 : sc.total >= par - 3 ? 3 : 2;
  const patch = { m: 'storm', code: S.scn.storm.code, stars, score: sc.total };
  const T = SCORE_TEXT.storm, pts = [s.sci, s.tim, s.res, s.rel], max = [35, 35, 20, 10];
  const { best, total } = crBestChange('storm');
  const tryHtml = best && best.dv > 0
    ? `<p class="r1">Try: ${best.lab}</p><p class="r2">Predicted score: ${best.total}/100 (+${best.dv})</p><p class="scope">Replay result with this satellite and Mission Code. Other Mission Codes may differ.</p>`
    : `<p class="r1">No single change scores higher with this satellite and Mission Code.</p><p class="scope" style="margin-top:6px">Try a different Mission Code, or change two decisions at once and compare.</p>`;
  return `<div class="screen">${nav(3)}<div class="cr">
   <div class="glass cr-hero ${chip}">
    <div class="out">${s.outcome === 'Mission Success' ? 'Mission Success' : s.outcome === 'Partial Success' ? 'Partial Success' : 'Mission Failed'}</div>
    <div class="cr-sc">${s.total}<small>/100</small></div>
    <div class="cr-bar"><i style="width:${s.total}%"></i></div>
    <div class="cr-patch">${patchSvg(patch, 72)}<span aria-label="${stars} of 3 stars">${'★'.repeat(stars)}${'☆'.repeat(3 - stars)}</span></div>
   </div>
   <div style="display:grid;gap:14px">
    <div class="glass cr-panel"><h3>Mission Goals</h3><div class="cr-goals">${s.req.map(r => `<div class="cr-g ${r[1] ? 'y' : 'n'}"><i>${r[1] ? '✓' : '✕'}</i><span>${r[0]}</span></div>`).join('')}</div></div>
    <div class="glass cr-panel"><h3>Your Decisions</h3><div class="cr-decs">${o.log.map((L, i) => `<div class="cr-dec"><b>${i + 1}. ${CH[i].title}</b><span>${L.choices}</span><p>${crOneLine(L.trade) || crOneLine(L.good)}</p></div>`).join('')}</div></div>
    <div class="glass cr-panel cr-try"><h3>Try Changing One Thing</h3>${tryHtml}</div>
    <details class="cr-breakdown"><summary>How was my score calculated?</summary>
     ${T.names.map((n, i) => `<div class="cr-bd-row"><b>${n}: ${pts[i].toFixed(1)}/${max[i]}</b><span>${T.how[i]}</span></div>`).join('')}
    </details>
   </div>
  </div>
  <div class="acts-row" style="margin-top:14px"><button class="btn blue" data-a="retry">Try Again</button><button class="btn primary" data-a="nextMission">Next Mission →</button></div>
  </div>`;
};
