/* storm-c3.js — Storm Watch Challenge 3 redesign: "Power Emergency!"
 * Replaces the six-hour planner with three two-hour periods (Early/Middle/Late),
 * each a simple Take Images / Save Power choice. Loaded after rescue.js, which
 * it overrides for ci===2 only; challenges 1, 2 and 4 and every other mission
 * are untouched.
 *
 * Engine mapping (inspected in engine.js before writing this file):
 *   Take Images -> both hours of the period run in 'full' mode (every image
 *                  the camera can take that hour).
 *   Save Power  -> both hours run in 'rest' mode (no images; essential
 *                  systems and the radio keep running on reduced load).
 * The 'one image' and 'eco' modes still exist in the engine (MODES in
 * rescue.js) and are unaffected; this panel simply offers two of the four
 * engine actions as the two student-facing choices, because testing showed
 * 'eco' (which still takes an image) made every one of the 8 period
 * combinations score almost identically — the decision stopped mattering.
 * 'rest' (no image) is what makes Early/Middle/Late a real trade-off.
 *
 * The observation hint is computed from the real per-phase science target
 * (12 total / 4 phases = 3 pts/phase) and the state the mission is actually
 * in before that period — never from hidden future storm behavior. The
 * seeded eclipse hour is deliberately NOT surfaced here: it is not revealed
 * to the player anywhere else during live play (only in the final debrief),
 * so showing it mid-challenge would leak hidden information.
 *
 * Rollback: remove the storm-c3.js line from index.html; Challenge 3 reverts
 * to the six-hour slot planner in rescue.js.
 */
'use strict';
document.head.insertAdjacentHTML('beforeend', `<style>
.c3 h3{font-family:Anton,Impact,sans-serif;font-weight:400;font-size:26px;text-transform:uppercase;margin-bottom:4px}
.c3 .sub{color:var(--muted);font-size:13px;line-height:1.5;margin-bottom:14px}
.c3fault{color:var(--warn);font-weight:600}
.c3periods{display:grid;grid-template-columns:repeat(3,1fr);gap:8px;margin-bottom:12px}
.c3pd{display:flex;flex-direction:column;align-items:flex-start;gap:3px;padding:10px 12px;border-radius:14px;border:2px solid var(--line);background:rgba(0,0,0,.25);text-align:left}
.c3pd small{font-size:11px;color:var(--dim)}
.c3pd b{font-size:15px;font-weight:700}
.c3pd .c3act{font-size:11px;font-weight:600;color:var(--muted)}
.c3pd.on{border-color:var(--blue);background:#2f7dff1a}
.c3pd.on .c3act{color:var(--blue)}
.c3obs{display:flex;align-items:center;gap:8px;font-size:12.5px;padding:8px 12px;border-radius:10px;margin-bottom:12px}
.c3obs.new{background:#3ddc9714;border:1px solid #3ddc9744;color:#bdf5de}
.c3obs.seen{background:#ffffff0c;border:1px solid #ffffff14;color:var(--muted)}
.c3q{font-size:13px;font-weight:600;margin-bottom:8px}
.c3opts{display:grid;grid-template-columns:1fr 1fr;gap:12px;margin-bottom:14px}
.c3opt{position:relative;display:flex;flex-direction:column;align-items:flex-start;gap:4px;padding:16px;border-radius:16px;border:2px solid var(--line);background:rgba(0,0,0,.25);text-align:left;min-height:108px}
.c3opt .ic{font-size:26px;line-height:1}
.c3opt b{font-size:15px;font-weight:700}
.c3opt span{font-size:12px;color:var(--muted)}
.c3opt.on{border-color:var(--blue);background:#2f7dff1f}
.c3opt .ck{position:absolute;top:10px;right:12px;color:var(--blue);font-weight:800;font-size:16px}
.c3prev{padding:14px 16px;border-radius:14px;border:1px solid var(--line);background:rgba(0,0,0,.25);margin-bottom:10px}
.c3row{display:flex;justify-content:space-between;align-items:center;font-size:12.5px;color:var(--muted);margin-bottom:4px}
.c3row b{color:#fff;font-weight:700}
.c3batwrap{display:flex;align-items:center;gap:10px;margin:4px 0 10px}
.c3bat{flex:1;height:8px;border-radius:999px;background:#ffffff1c;overflow:hidden}
.c3bat i{display:block;height:100%;border-radius:inherit}
.c3bat i.good{background:var(--good)}.c3bat i.warn{background:var(--warn)}.c3bat i.bad{background:var(--bad)}
.c3batwrap b{font-size:13px;font-weight:700;min-width:34px;text-align:right}
.st.good{color:var(--good)}.st.warn{color:var(--warn)}.st.bad{color:var(--bad)}
.c3warn{display:flex;align-items:center;gap:8px;font-size:12.5px;padding:9px 12px;border-radius:10px;background:#ff7a6b1a;border:1px solid #ff7a6b55;color:#ffd4ce;margin-bottom:12px}
.c3more{margin-bottom:14px}
.c3more summary{cursor:pointer;font-size:12px;color:var(--muted);list-style:none}
.c3more summary::-webkit-details-marker{display:none}
.c3more summary::before{content:'▸ ';color:var(--blue)}
.c3more[open] summary::before{content:'▾ '}
.c3hrs{display:grid;grid-template-columns:repeat(6,1fr);gap:6px;margin-top:8px}
.c3hr{text-align:center;padding:6px 2px;border-radius:8px;background:rgba(0,0,0,.25);border:1px solid var(--line)}
.c3hr small{display:block;font-size:10px;color:var(--dim)}
.c3hr b{font-size:12px}
@media(max-width:700px){.c3periods,.c3opts{grid-template-columns:1fr}}
</style>`);

function c3Panel(o, M, p, x) {
  if (x.sel === undefined) x.sel = 0;
  const PERIODS = [['Early', '12:00–14:00'], ['Middle', '14:00–16:00'], ['Late', '16:00–18:00']];
  const solar = Math.round((M.scn ? M.scn.anomalySolar : M.C.anomalySolarFactor) * 100);
  const periods = [0, 1, 2].map(i => x.sched[i * 2] === 'full' ? 'img' : 'save');
  const sel = x.sel;
  const target = M.C.requiredCollectedScience / 4;
  const beforeState = sel === 0 ? ENG.derive(M) : p.tr[sel * 2 - 1];
  const already = beforeState.collectedByPhase[2] >= target - 1e-9;
  const obsNote = already ? 'This storm phase is already well observed — more images here add less.' : 'New storm information is still available this phase.';
  const d = p.d, skipped = p.snap.missed > 0;
  const status = d.batteryPct < 15 ? 'Critical' : d.batteryPct < 30 ? 'Low' : 'Safe';
  const sc = status === 'Safe' ? 'good' : status === 'Low' ? 'warn' : 'bad';
  const warn = skipped ? 'Battery too low — an image had to be skipped. Try saving power during one period.'
    : status !== 'Safe' ? 'Battery is getting low. Try saving power during one period.' : '';
  return `<h3>Power Emergency!</h3>
  <p class="sub">Your solar panels are damaged. Choose when to take storm images while protecting your battery.<br><span class="c3fault">Only ${solar}% power until 18:00.</span></p>
  <div class="c3periods" role="radiogroup" aria-label="Choose a time period">${PERIODS.map((pp, i) => `<button class="c3pd ${i === sel ? 'on' : ''}" data-a="c3Period" data-i="${i}" role="radio" aria-checked="${i === sel}"><small>${pp[1]}</small><b>${pp[0]}</b><span class="c3act">${periods[i] === 'img' ? '📷 Take Images' : '🔋 Save Power'}</span></button>`).join('')}</div>
  <div class="c3obs ${already ? 'seen' : 'new'}" role="status">${already ? '●' : '✦'} ${obsNote}</div>
  <p class="c3q">What should your satellite do during the ${PERIODS[sel][0]} period?</p>
  <div class="c3opts" role="radiogroup" aria-label="Action for this period">
    <button class="c3opt ${periods[sel] === 'img' ? 'on' : ''}" data-a="c3Action" data-v="img" role="radio" aria-checked="${periods[sel] === 'img'}">${periods[sel] === 'img' ? '<i class="ck">✓</i>' : ''}<span class="ic" aria-hidden="true">📷</span><b>Take Images</b><span>Collect storm information. Uses more battery.</span></button>
    <button class="c3opt ${periods[sel] === 'save' ? 'on' : ''}" data-a="c3Action" data-v="save" role="radio" aria-checked="${periods[sel] === 'save'}">${periods[sel] === 'save' ? '<i class="ck">✓</i>' : ''}<span class="ic" aria-hidden="true">🔋</span><b>Save Power</b><span>Protect your battery. May miss storm images.</span></button>
  </div>
  <div class="c3prev">
    <div class="c3row"><span>Battery at 18:00</span></div>
    <div class="c3batwrap"><div class="c3bat"><i class="${sc}" style="width:${Math.max(3, Math.min(100, d.batteryPct))}%"></i></div><b>${Math.round(d.batteryPct)}%</b></div>
    <div class="c3row"><span>Useful storm data</span><b>${fmt(d.deliveredScience)} / 12</b></div>
    <div class="c3row"><span>Battery status</span><b class="st ${sc}">${status}</b></div>
  </div>
  ${warn ? `<div class="c3warn" role="alert">⚠ ${warn}</div>` : ''}
  <details class="c3more"><summary>Hourly battery breakdown</summary><div class="c3hrs">${x.sched.map((m, i) => { const b = p.tr[i] ? p.tr[i].batteryPct : 0; return `<div class="c3hr"><small>${12 + i}:00</small><b>${Math.round(b)}%</b></div>`; }).join('')}</div></details>
  <div class="dfoot"><button class="btn blue" data-a="run" style="width:100%;height:50px;font-size:15px">Run My 6-Hour Plan</button></div>`;
}

const __ixPanel_c3 = ixPanel;
ixPanel = function () {
  const o = S.ops, ci = o.ci;
  if (ci !== 2) return __ixPanel_c3();
  const x = ixGet(), p = ixPreview();
  return `<div class="glass decision ix c3" id="ixPanel">${c3Panel(o, o.M, p, x)}</div>`;
};

document.addEventListener('click', e => {
  const b = e.target.closest('[data-a="c3Period"],[data-a="c3Action"]');
  if (!b || S.screen !== 'ops' || !S.ops || S.ops.phase !== 'choose' || S.ops.ci !== 2) return;
  const o = S.ops, x = o.ix && o.ix[2]; if (!x) return;
  if (b.dataset.a === 'c3Period') { x.sel = +b.dataset.i; ixRefresh(); const el = document.querySelector(`[data-a="c3Period"][data-i="${x.sel}"]`); if (el) el.focus(); }
  else { const idx = x.sel === undefined ? 0 : x.sel, pair = b.dataset.v === 'img' ? ['full', 'full'] : ['rest', 'rest'];
    x.sched[idx * 2] = pair[0]; x.sched[idx * 2 + 1] = pair[1]; ixRefresh();
    const el = document.querySelector(`[data-a="c3Action"][data-v="${b.dataset.v}"]`); if (el) el.focus(); }
});

/* "what happened" / "change one thing" labels, rewritten to match the three-period language */
const __ixAfter_c3 = ixAfter;
ixAfter = function (ci) {
  __ixAfter_c3(ci);
  if (ci !== 2) return;
  const o = S.ops, x = o.ix && o.ix[2], L = o.log[2]; if (!x || !L) return;
  const PERIODS = ['Early', 'Middle', 'Late'];
  L.choices = PERIODS.map((lab, i) => `${lab}: ${x.sched[i * 2] === 'full' ? 'Take Images' : 'Save Power'}`).join(' · ');
};
