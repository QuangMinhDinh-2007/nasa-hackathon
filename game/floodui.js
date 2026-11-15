/* floodui.js — Flood Watch Challenge 1 simplification. Loaded last.
 * Presentation only: retitles the first decision as "Map the Flood" with two
 * numbered steps, gives the detail options plain quality/storage phrasing,
 * pulses the pass tags when a zone is picked, and replaces the Challenge 1
 * result paragraphs with three metrics plus one achieved / one traded sentence.
 * Engine, targeting rules, scoring and all later challenges unchanged.
 * Rollback: remove the floodui.js line from index.html. */
'use strict';
document.head.insertAdjacentHTML('beforeend', `<style>
@keyframes tkpop{0%{transform:scale(.6);opacity:.2}100%{transform:scale(1);opacity:1}}
.vzone .tkz{animation:tkpop .25s ease}
.fstep{display:inline-grid;place-items:center;width:22px;height:22px;border-radius:50%;background:var(--blue);color:#fff;font-size:12px;font-weight:700;margin-right:8px}
.fm3{display:grid;grid-template-columns:repeat(3,1fr);gap:12px;margin:12px 0 14px}
.fmt{padding:14px 16px;border-radius:14px;border:1px solid var(--line);background:rgba(0,0,0,.25);text-align:center}
.fmt b{display:block;font-family:Anton,Impact,sans-serif;font-weight:400;font-size:30px;line-height:1}
.fmt span{font-size:12px;color:var(--muted)}
.fsent{font-size:13px;line-height:1.6;padding:9px 12px;border-radius:12px;margin-bottom:8px}
.fsent.ok{background:#3ddc9714;border:1px solid #3ddc9744}
.fsent.tr{background:#ffc85712;border:1px solid #ffc85740}
.fbig .dfoot .btn.primary{height:52px;padding:0 30px;font-size:15px}
@media(max-width:700px){.fm3{grid-template-columns:1fr}}
@media (prefers-reduced-motion: reduce){.vzone .tkz{animation:none}}
</style>`);

function floodC1Mount() {
  if (S.screen !== 'lops' || !S.l || !S.l.M || S.l.ci !== 0) return;
  const o = S.l, dec = document.querySelector('.decision'); if (!dec) return;
  if (o.phase === 'choose') {
    const h3 = dec.querySelector('.dhead h3'), p = dec.querySelector('.dhead p');
    if (h3) h3.textContent = 'Map the Flood';
    if (p) p.textContent = 'The river is flooding! Choose where to take satellite pictures and how detailed they should be.';
    const strip = document.getElementById('tkStrip');
    if (strip && !strip.dataset.c1) { strip.dataset.c1 = '1';
      strip.firstChild.remove(); // old "Aim each pass." bold lead
      if (strip.firstChild && strip.firstChild.nodeType === 3) strip.firstChild.remove(); // and its trailing sentence
      strip.insertAdjacentHTML('afterbegin', `<span class="fstep">1</span><b>Choose where to scan at 11:00 and 14:00.</b><br><span class="muted" style="font-size:12px">One area = a focused, sharpest look. All three = a wider picture at 80% detail.</span>`); }
    const lab = [...dec.querySelectorAll('.og .lab')].find(l => /map detail/i.test(l.textContent));
    if (lab && !lab.dataset.c1) { lab.dataset.c1 = '1';
      lab.innerHTML = `<span class="fstep">2</span>Choose Standard or High Detail.`; lab.style.textTransform = 'none'; lab.style.letterSpacing = '0';
      const og = lab.closest('.og'), spans = og.querySelectorAll('.opt span');
      if (spans[0]) spans[0].textContent = 'Good quality · smaller files that send faster';
      if (spans[1]) spans[1].textContent = 'Sharpest quality · bigger files that fill storage faster'; }
  } else if (o.phase === 'result' && o.log[0]) {
    const grid = dec.querySelector('.res-grid'); if (!grid || grid.dataset.c1) return; grid.dataset.c1 = '1';
    const x = lD(), M = o.M, C = M.C;
    const zonesQ = new Set(x.zonesQ), missing = FL.ZONES.filter(z => !zonesQ.has(z)).map(z => FL.ZNAME[z]);
    const gbPerContact = (M.P.comms.rateGBmin * C.contactMin).toFixed(1);
    const achieved = `You captured ${x.nCaptured} map${x.nCaptured === 1 ? '' : 's'} worth ${fmt(x.collected)} map points, and ${x.nDelivered === 0 ? 'none have' : x.nDelivered + ' ha' + (x.nDelivered === 1 ? 's' : 've')} reached responders so far (${fmt(x.delivered)} points delivered).`;
    let traded = '';
    if (missing.length) traded += `No clear map yet of ${missing.join(' and ')}. `;
    if (x.nOnboard > 0) traded += `${x.nOnboard} map${x.nOnboard === 1 ? ' is' : 's are'} still on board: each 10-minute contact sends only ${gbPerContact} GB, so big maps wait in the queue.`;
    if (!traded) traded = 'Nothing was traded away this run: every map was delivered and every area has a clear map.';
    grid.outerHTML = `<div class="fm3">
      <div class="fmt"><b>${x.coveredZones} / 3</b><span>Areas mapped</span></div>
      <div class="fmt"><b>${fmt(x.delivered)} / ${C.requiredMaps}</b><span>Map points delivered</span></div>
      <div class="fmt"><b>${Math.round(x.storagePct)}%</b><span>Storage used</span></div></div>
      <div class="fsent ok">✓ ${achieved}</div>
      <div class="fsent tr">⚠ ${traded}</div>`;
    dec.classList.add('fbig');
    const lesson = dec.querySelector('.lesson');
    if (lesson) lesson.textContent = 'Captured is not delivered: a map only helps responders once it is fully sent to the ground.';
  }
}
const __renderFC1 = render; render = function () { __renderFC1(); floodC1Mount(); };
if (typeof softView === 'function') softView = (f => function () { f(); floodC1Mount(); })(softView);
floodC1Mount();
