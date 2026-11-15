/* storm-c3.js — Storm Watch Challenge 3 redesign: "Power Emergency!"
 * Replaces the six-hour planner with three two-hour periods (12-14, 14-16,
 * 16-18), each a compact Save Power / Take Images segmented toggle, all three
 * visible and directly editable at once (no period-selection step). Loaded
 * after rescue.js, which it overrides for ci===2 only; challenges 1, 2 and 4
 * and every other mission are untouched.
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
 * No per-period observation banner or hidden-information hint is shown
 * (removed per request, to keep this to one compact control panel); only
 * the live battery/science prediction and, when the prediction is actually
 * risky, one short warning line.
 *
 * Rollback: remove the storm-c3.js line from index.html; Challenge 3 reverts
 * to the six-hour slot planner in rescue.js.
 */
'use strict';
document.head.insertAdjacentHTML('beforeend', `<style>
.c3 h3{font-family:Anton,Impact,sans-serif;font-weight:400;font-size:26px;text-transform:uppercase;margin-bottom:4px}
.c3 .sub{color:var(--muted);font-size:13px;line-height:1.5;margin-bottom:14px}
.c3fault{color:var(--warn);font-weight:600}
.c3rows{display:grid;gap:8px;margin-bottom:12px}
.c3row2{display:flex;align-items:center;justify-content:space-between;gap:12px;padding:9px 12px;border-radius:12px;border:1px solid var(--line);background:rgba(0,0,0,.25)}
.c3row2 .lab{font-size:13px;font-weight:600;color:var(--muted)}
.c3tg{display:flex;padding:3px;border-radius:999px;border:1px solid var(--line);background:#0006;flex:none}
.c3tg button{height:30px;padding:0 14px;border-radius:999px;font-size:12.5px;font-weight:600;color:var(--muted);white-space:nowrap}
.c3tg button.on{background:#fff;color:#000}
.c3tg button.on.img{background:var(--blue);color:#fff}
.c3prev{padding:14px 16px;border-radius:14px;border:1px solid var(--line);background:rgba(0,0,0,.25);margin-bottom:10px}
.c3row{display:flex;justify-content:space-between;align-items:center;font-size:12.5px;color:var(--muted);margin-bottom:4px}
.c3row b{color:#fff;font-weight:700}
.c3batwrap{display:flex;align-items:center;gap:10px;margin:4px 0 10px}
.c3bat{flex:1;height:8px;border-radius:999px;background:#ffffff1c;overflow:hidden}
.c3bat i{display:block;height:100%;border-radius:inherit}
.c3bat i.good{background:var(--good)}.c3bat i.warn{background:var(--warn)}.c3bat i.bad{background:var(--bad)}
.c3batwrap b{font-size:13px;font-weight:700;min-width:34px;text-align:right}
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
@media(max-width:480px){.c3row2{flex-direction:column;align-items:flex-start}}
</style>`);

const C3_PERIODS = [['12:00–14:00'], ['14:00–16:00'], ['16:00–18:00']];
function c3Panel(o, M, p, x) {
  const solar = Math.round((M.scn ? M.scn.anomalySolar : M.C.anomalySolarFactor) * 100);
  const periods = [0, 1, 2].map(i => x.sched[i * 2] === 'full' ? 'img' : 'save');
  const d = p.d, skipped = p.snap.missed > 0;
  const status = d.batteryPct < 15 ? 'Critical' : d.batteryPct < 30 ? 'Low' : 'Safe';
  const sc = status === 'Safe' ? 'good' : status === 'Low' ? 'warn' : 'bad';
  const warn = skipped ? 'Battery too low! An image had to be skipped — try saving more power.'
    : status !== 'Safe' ? 'Low battery! Try saving more power.' : '';
  return `<h3>Power Emergency!</h3>
  <p class="sub">Only ${solar}% solar power. Choose when to take images or save battery.</p>
  <div class="c3rows" role="group" aria-label="Period actions">${C3_PERIODS.map((pp, i) => `<div class="c3row2"><span class="lab">${pp[0]}</span>
    <div class="c3tg" role="radiogroup" aria-label="${pp[0]} action">
      <button class="${periods[i] === 'save' ? 'on' : ''}" data-a="c3Toggle" data-i="${i}" data-v="save" aria-pressed="${periods[i] === 'save'}">Save Power</button>
      <button class="${periods[i] === 'img' ? 'on img' : ''}" data-a="c3Toggle" data-i="${i}" data-v="img" aria-pressed="${periods[i] === 'img'}">Take Images</button>
    </div></div>`).join('')}</div>
  <p class="c3q" style="font-size:13px;font-weight:600;margin-bottom:6px">Your Plan</p>
  <div class="c3prev">
    <div class="c3row"><span>Battery at 18:00</span></div>
    <div class="c3batwrap"><div class="c3bat"><i class="${sc}" style="width:${Math.max(3, Math.min(100, d.batteryPct))}%"></i></div><b>${Math.round(d.batteryPct)}%</b></div>
    <div class="c3row"><span>Storm data</span><b>${fmt(d.deliveredScience)} / 12</b></div>
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
  const b = e.target.closest('[data-a="c3Toggle"]');
  if (!b || S.screen !== 'ops' || !S.ops || S.ops.phase !== 'choose' || S.ops.ci !== 2) return;
  const o = S.ops, x = o.ix && o.ix[2]; if (!x) return;
  const idx = +b.dataset.i, pair = b.dataset.v === 'img' ? ['full', 'full'] : ['rest', 'rest'];
  x.sched[idx * 2] = pair[0]; x.sched[idx * 2 + 1] = pair[1]; ixRefresh();
  const el = document.querySelector(`[data-a="c3Toggle"][data-i="${idx}"][data-v="${b.dataset.v}"]`); if (el) el.focus();
});

/* "what happened" / "change one thing" labels, rewritten to match the three-period language */
const __ixAfter_c3 = ixAfter;
ixAfter = function (ci) {
  __ixAfter_c3(ci);
  if (ci !== 2) return;
  const o = S.ops, x = o.ix && o.ix[2], L = o.log[2]; if (!x || !L) return;
  L.choices = C3_PERIODS.map((pp, i) => `${pp[0]}: ${x.sched[i * 2] === 'full' ? 'Take Images' : 'Save Power'}`).join(' · ');
};
