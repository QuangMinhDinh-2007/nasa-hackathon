/* Earth Missions v6.2 — Wildfire clarity and accessibility. Loaded after fun.js.
 * Ports the Wildfire Watch review changes into the v6.1 game:
 *   1. map legend, and marker / region states told apart by shape and text, not only colour
 *   2. region freshness badges (observed hh:mm · update needed after 6 h · never observed)
 *   3. a note on the map when a pass could not be imaged, with the reason
 *   4. keyboard-focusable markers and badges (their hover cards also open on focus or tap)
 *   5. a screen-reader announcement when each 6-hour run finishes; focus ring; reduced motion
 *   6. a data-delivery check on the Wildfire build screen for Advanced imager + Standard comms
 * Nothing here changes a simulation result or a mission score. Results stay held until playback
 * ends (or Skip), as in v6.1's journey playback.
 * Rollback: remove the fireplus.js line from index.html.
 */
'use strict';
document.head.insertAdjacentHTML('beforeend', `<style>
:focus-visible{outline:3px solid #7fb6ff;outline-offset:2px}
.sr-only{position:absolute;width:1px;height:1px;padding:0;margin:-1px;overflow:hidden;clip:rect(0 0 0 0);white-space:nowrap;border:0}
@media (prefers-reduced-motion: reduce){*,*::before,*::after{animation-duration:.01ms!important;animation-iteration-count:1!important;transition:none!important}}
.hot{width:20px;height:20px;margin:-10px 0 0 -10px;display:flex;align-items:center;justify-content:center;font:800 12px/1 system-ui,sans-serif;box-sizing:border-box}
.hot.held{background:#0b0f18cc;border:2px solid #ff9d3d;box-shadow:0 0 10px 2px #ff6a2a55;color:#ff9d3d}
.hot.missed{border:2px dashed #ffffffcc;color:#fff}
.hot .g{pointer-events:none}
.hot .lb{font-size:12px!important}
.fbadge{position:absolute;left:10px;bottom:8px;z-index:3;font-size:12px;font-weight:600;padding:2px 8px;border-radius:999px;background:#000b;border:1px solid currentColor;white-space:nowrap}
.fbadge.recent{color:#3ddc97}.fbadge.stale{color:#ffcc66}.fbadge.never{color:#ffffffa0;border-style:dashed}
.fskip{position:absolute;left:50%;top:48px;transform:translateX(-50%);z-index:4;font-size:12px;font-weight:600;padding:4px 10px;border-radius:8px;background:#000c;color:#ffcc66;border:1px solid #ffcc6666}
.flegend{display:flex;flex-wrap:wrap;gap:6px 14px;align-items:center;margin:8px 4px 0;font-size:12px;color:var(--muted)}
.flegend b{color:#fff;font-weight:600}.flegend span{display:inline-flex;align-items:center;gap:5px}
.flegend .k{width:13px;height:13px;border-radius:50%;box-sizing:border-box;display:inline-flex;align-items:center;justify-content:center;font:800 9px/1 system-ui,sans-serif}
.fwarn{position:absolute;right:22px;width:270px;padding:14px 16px;box-sizing:border-box;border-color:#ffcc6688!important;font-size:12.5px;line-height:1.5}
.fwarn .t{display:flex;gap:8px;align-items:center;font-size:12px;letter-spacing:.14em;text-transform:uppercase;font-weight:700;color:#ffcc66;margin-bottom:6px}
</style>`);
const GAME62 = '6.2';
const ann = document.createElement('div'); ann.id = 'fAnn'; ann.className = 'sr-only'; ann.setAttribute('role', 'status'); ann.setAttribute('aria-live', 'polite'); document.body.appendChild(ann);
const announce = txt => { ann.textContent = ''; setTimeout(() => { ann.textContent = txt; }, 60); };

/* ---------- map state, read from the finished simulation at the time being shown ---------- */
function fNow() { const M = S.f.M; return S.live ? S.live.t : M.step * WC.stepMin / 60; }
function fRegionState(M, t) { const last = { A: null, B: null, C: null };
  M.items.forEach(i => { if (i.kind !== 'image' || i.t > t + 1e-9) return; (i.regions || []).forEach(r => { if (last[r] === null || i.t > last[r]) last[r] = i.t; }); });
  const out = {}; Object.keys(last).forEach(r => { const h = last[r]; out[r] = h === null ? { st: 'never', g: '○', txt: 'Never observed', tip: 'Your satellite has not imaged this region yet.' }
    : (t - h > 6 + 1e-9 ? { st: 'stale', g: '⚠', txt: 'Update needed', tip: `Last imaged at ${fmtH(h)}, more than 6 h ago. A freshness reminder, not a failure.` }
    : { st: 'recent', g: '✓', txt: 'Observed ' + fmtH(h), tip: 'Imaged by your satellite at ' + fmtH(h) + '.' }); });
  return out; }
function fSkipNote(M, ci) { const p = WC.passes[ci]; if (!p) return '';
  const ev = M.events.find(e => /^Imaging skipped/.test(e.msg) && e.h >= p.h - 1e-9 && e.h < p.h + 0.5);
  const took = M.items.some(i => i.kind === 'image' && i.pass === ci);
  if (M.step * WC.stepMin / 60 < p.h + 0.5 - 1e-9) return '';
  if (took) return ev ? `Pass ${fmtH(p.h)}: an extra image was not taken (${ev.msg.replace(/^Imaging skipped:\s*/, '')})` : '';
  const plan = M.decisions && M.decisions[2] && M.decisions[2][1] === 'skip' && ci === 2;
  const why = ev ? ev.msg.replace(/^Imaging skipped:\s*/, '') : plan ? 'skipped by your plan' : 'satellite in safe mode';
  return `Pass ${fmtH(p.h)} not imaged: ${why}`; }

const _fireArt = fireArt;
fireArt = function (reveal) { const M = S.f.M, t = reveal ? 24 : fNow(); const rs = fRegionState(M, t);
  const regs = Object.entries(REG).map(([k, r]) => { const s = rs[k];
    return `<div class="freg ${k === 'C' ? 'comm' : ''}" style="left:${r.l}%;top:${r.t}%;width:${r.w}%;height:${r.h}%"><b>${r.n}</b>`
      + (reveal ? '</div>' : `<span class="fbadge ${s.st}" tabindex="0" role="note" aria-label="Region ${r.n}: ${s.txt}. ${s.tip}" data-tip="${s.txt}||${s.tip}"><span aria-hidden="true">${s.g}</span> ${s.txt}</span></div>`); }).join('');
  const shown = reveal ? WC.events : WC.events.filter(e => M.detected.has(e.id) && WC.passes[e.pass].h <= t + 1e-9);
  const hs = shown.map(e => { const [x, y] = EVPOS[e.id], miss = !M.detected.has(e.id), cont = /continued/.test(e.name);
    const al = M.items.find(i => i.kind === 'alert' && i.event === e.id), sent = !!(al && al.status === 'delivered' && al.deliveredAt <= t + 1e-9);
    const late = sent && al.deliveredAt - al.t > WC.alertOnTimeH + 1e-9;
    const cls = miss ? 'missed' : sent ? '' : 'held', g = miss ? '×' : sent ? '' : '!';
    const state = miss ? 'Not detected by your satellite (simulated fire)' : sent ? (late ? 'Detected · alert delivered late' : 'Detected · alert delivered') : 'Detected · alert not yet delivered';
    const name = `${e.name} (${e.cls}, ${fmtH(WC.passes[e.pass].h)} pass)`;
    return `<div class="hot ${cls}" tabindex="0" role="img" aria-label="${name}. ${state}." data-tip="${name}||${state}" style="left:${x}%;top:${y}%"><span class="g" aria-hidden="true">${g}</span>${reveal && (!cont || miss) ? `<span class="lb ${x > 65 ? 'l' : ''}">${cont ? 'Known fire, ' + fmtH(WC.passes[e.pass].h) : e.name}${miss ? ' · missed' : ''}</span>` : ''}</div>`; }).join('');
  return `<div class="fmap"></div>${regs}${hs}`; };

const LEGEND = `<div class="flegend" id="fLegend" role="list" aria-label="Map legend"><b>Map key</b>
  <span role="listitem"><i class="k" aria-hidden="true" style="background:radial-gradient(circle,#fff3c2 0,#ff9d3d 45%,#ff4d1c 75%)"></i>Fire · alert sent</span>
  <span role="listitem"><i class="k" aria-hidden="true" style="border:2px solid #ff9d3d;color:#ff9d3d">!</i>Detected, alert not sent</span>
  <span role="listitem"><i class="k" aria-hidden="true" style="border:1.5px dashed #fff;color:#fff">×</i>Missed (shown in the report)</span>
  <span role="listitem"><span aria-hidden="true" style="color:#3ddc97">✓</span>Observed</span>
  <span role="listitem"><span aria-hidden="true" style="color:#ffcc66">⚠</span>Update needed (&gt;6 h)</span>
  <span role="listitem"><span aria-hidden="true" style="color:#ffffffa0">○</span>Never observed</span></div>`;
const WARN_TXT = 'An Advanced thermal image is 1.0–1.5 GB. Standard communications sends 0.6 GB per hour, and the satellite only talks to Earth during five 1-hour ground contacts. Ask yourself how much imagery can reach Earth before it goes stale, and before the mission ends.';
function firePlusMount() {
  if ((S.screen === 'fops' || S.screen === 'freport') && S.f && S.f.M) { const v = document.querySelector('.view');
    if (v && !document.getElementById('fLegend')) v.insertAdjacentHTML('afterend', LEGEND);
    if (v && S.screen === 'fops' && S.f.phase === 'result' && !v.querySelector('.fskip')) { const n = fSkipNote(S.f.M, S.f.ci); if (n) v.insertAdjacentHTML('beforeend', `<div class="fskip" role="note">${n}</div>`); } }
  if (S.screen === 'fbuild' && S.fdesign) { const pad = document.querySelector('.pad'), nose = pad && pad.querySelector('.nose');
    if (pad && nose && S.fdesign.instrument === 'adv' && S.fdesign.comms === 'std' && !pad.querySelector('.fwarn')) {
      pad.insertAdjacentHTML('beforeend', `<div class="glass fwarn" role="note" style="top:${nose.offsetTop + nose.offsetHeight + 14}px"><div class="t"><span aria-hidden="true">⚠</span>Data delivery check</div>${WARN_TXT}</div>`); } } }
const __render62 = render; render = function () { tipHide(); __render62(); firePlusMount(); };
softView = (f => function () { f(); firePlusMount(); })(softView);

/* ---------- announce each finished run (all missions) ---------- */
const __endJourney62 = endJourney;
endJourney = function () { const j = S.jr; if (!j) return; const m = j.m, ci = MX[m].st().ci; __endJourney62();
  if (m === 'fire') { const M = S.f.M, n = M.items.filter(i => i.kind === 'alert' && i.pass === ci).length, skip = fSkipNote(M, ci);
    const took = M.items.some(i => i.kind === 'image' && i.pass === ci);
    announce(`Challenge ${ci + 1} complete. ${took ? (n ? `Scan complete: ${n} new hotspot${n > 1 ? 's' : ''} detected.` : 'Scan complete: no new hotspots detected.') : ''}${skip ? ' ' + skip + '.' : ''} Dashboard updated.`); }
  else announce(`Challenge ${ci + 1} complete. Dashboard updated.`); };

/* ---------- touch: a tap on a focusable marker or badge keeps its card open ---------- */
document.addEventListener('click', e => { const el = e.target.closest && e.target.closest('.hot[data-tip],.fbadge[data-tip]'); if (el) setTimeout(() => tipShow(el), 0); });

if (typeof module !== 'undefined') module.exports = { fRegionState, fSkipNote };
