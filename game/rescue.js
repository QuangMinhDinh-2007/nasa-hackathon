/* Earth Missions v5.1 — UX rescue + direct-manipulation challenges for Storm Watch.
 * Loaded after upgrade.js. Removes the mascot, chat and voice; stops re-render flicker; replaces the four
 * Storm Watch option screens with controls that feed the real engine through M.ext (see engine.js v3.6).
 */
'use strict';
/* ---------------- 1. remove mascot, chat and voice ---------------- */
try { window.speechSynthesis && window.speechSynthesis.cancel(); } catch (e) {}
speak = function () {}; renderCrew = function () {}; pipFly = function () {};
crewAdvice = function (m) { MX[m].st().fc = null; };
{ const c = document.getElementById('crew'); if (c) c.remove(); }
say = function (who, html) { const m = missionOfScreen(); if (!m || (who !== 'pip' && who !== 'sim')) return; const X = MX[m], st = X.st && X.st();
  if (!st || st.phase !== 'result' || S.screen !== X.screens[1]) return; st.notes = st.notes || {}; (st.notes[st.ci] = st.notes[st.ci] || []).push(html); injectNotes(); };
function injectNotes() { const m = missionOfScreen(); if (!m) return; const X = MX[m], st = X.st && X.st(); if (!st || st.phase !== 'result' || S.screen !== X.screens[1]) return;
  const list = (st.notes || {})[st.ci]; const grid = document.querySelector('.decision .res-grid'); if (!list || !grid) return;
  let el = document.getElementById('rnote'); if (!el) { el = document.createElement('div'); el.id = 'rnote'; el.className = 'rnote'; grid.parentNode.insertBefore(el, grid); }
  el.innerHTML = list.map(h => `<p>${h}</p>`).join(''); }
fpAttr = (f => function () { return missionOfScreen() === 'storm' ? '' : f(); })(fpAttr);

/* ---------------- 2. styles ---------------- */
document.head.insertAdjacentHTML('beforeend', `<style>
.screen.noanim{animation:none}
.scanbox.flash{animation:none!important}
.rnote{margin:12px 0 0;padding:10px 14px;border-left:3px solid #7fb6ff;background:#7fb6ff14;border-radius:0 10px 10px 0;font-size:13px;line-height:1.5}
.rnote p+p{margin-top:6px}
.ixsvg{position:absolute;inset:0;width:100%;height:100%;z-index:2;pointer-events:none}
.ixbox{position:absolute;z-index:4;border:2px solid #ffcc66;border-radius:6px;box-shadow:0 0 0 9999px #00000038;cursor:grab;touch-action:none}
.ixbox:focus-visible{outline:3px solid #fff;outline-offset:2px}
.ixbox.drag{cursor:grabbing}
.ixbox.fixed{cursor:default;border-style:dashed;box-shadow:none;opacity:.55;pointer-events:none}
.ixbox .hd{position:absolute;right:-15px;bottom:-15px;width:30px;height:30px;border-radius:50%;background:#ffcc66;border:3px solid #111;cursor:nwse-resize}
.ixbox .lb{position:absolute;left:8px;top:6px;font-size:14px;font-weight:600;color:#ffcc66;white-space:nowrap}
.ix h3{font-size:clamp(26px,2.4vw,30px);margin:0}.ix .sub{color:var(--muted);font-size:15px;margin:6px 0 14px}
.ixrow{display:flex;gap:10px;flex-wrap:wrap;align-items:center}
.ixstat{flex:1;min-width:130px;padding:12px 14px;border:1px solid var(--line);border-radius:12px;background:#0004}
.ixstat span{display:block;font-size:14px;color:var(--muted)}.ixstat b{font-size:19px}
.ixstat.warn b{color:#ffcc66}.ixstat.bad b{color:#ff7a7a}.ixstat.good b{color:#5fe0a0}
.ixprev{margin-top:12px;padding:12px 14px;border-radius:12px;background:#3d8bff14;border:1px solid #3d8bff44;font-size:15px}
.ixprev[hidden]{display:none}
.ixprev b{color:#fff}
.sg2{display:inline-flex;border:1px solid var(--line);border-radius:10px;overflow:hidden}
.sg2 button{padding:12px 16px;font-size:15px;color:var(--muted);background:#0004;border-right:1px solid var(--line)}
.sg2 button:last-child{border-right:0}.sg2 button.on{background:#fff;color:#000;font-weight:600}
.sg2 button.on.drop{background:#ff7a7a}.sg2 button.on.first{background:#5fe0a0}
.pk{display:grid;grid-template-columns:auto 1fr auto;gap:10px;align-items:center;padding:10px 12px;border:1px solid var(--line);border-radius:10px;margin-bottom:6px;background:#0003;font-size:14.5px}
.pk .id{font-weight:700;width:34px}.pk .meta{color:var(--muted)}.pk .meta b{color:#fff;font-weight:600}
.pk.late .meta b.eta{color:#ff7a7a}.pk.ok .meta b.eta{color:#5fe0a0}
.pklist{max-height:280px;overflow:auto;margin-bottom:10px}
.slots{display:grid;grid-template-columns:repeat(6,1fr);gap:8px}
.slot{padding:12px 6px;border-radius:12px;border:1px solid var(--line);background:#0004;text-align:center}
.slot small{display:block;color:var(--muted);font-size:13px}.slot b{display:block;font-size:15px;margin:4px 0}
.slot.full{border-color:#7fb6ff;background:#3d8bff22}.slot.one{border-color:#5fe0a0;background:#5fe0a01a}.slot.eco{border-color:#ffcc66;background:#ffcc661a}.slot.rest{opacity:.75}
.slot .bat{height:46px;display:flex;align-items:flex-end;justify-content:center;margin-top:6px}
.slot .bat i{display:block;width:60%;border-radius:4px 4px 0 0;background:#5fe0a0;transition:height .25s}
.slot .bat i.low{background:#ff7a7a}.slot .bat i.mid{background:#ffcc66}
.ixset{display:flex;gap:18px;flex-wrap:wrap;align-items:center;margin-top:12px}.ixset .lab{font-size:14px;color:var(--muted);margin-bottom:6px}
.ixrun{margin-left:auto;height:50px;padding:0 26px;font-size:clamp(15px,1.1vw,17px)}
.mini{padding:8px 12px;border-radius:9px;border:1px solid var(--line);font-size:13px;color:#fff;background:#0004}
.mini:hover{background:#ffffff14}
input[type="range"]{-webkit-appearance:none;appearance:none;width:160px;height:28px;background:transparent;vertical-align:middle}
input[type="range"]::-webkit-slider-runnable-track{height:10px;border-radius:6px;background:#ffffff26}
input[type="range"]::-webkit-slider-thumb{-webkit-appearance:none;width:28px;height:28px;border-radius:50%;background:#ffcc66;border:2px solid #111;margin-top:-9px;cursor:pointer}
input[type="range"]::-moz-range-track{height:10px;border-radius:6px;background:#ffffff26}
input[type="range"]::-moz-range-thumb{width:28px;height:28px;border-radius:50%;background:#ffcc66;border:2px solid #111;cursor:pointer}
#musicBtn{position:fixed;right:16px;bottom:16px;z-index:50;padding:8px 12px;border-radius:999px;border:1px solid #ffffff33;background:#000a;color:#fff;font-size:12px}
@media (prefers-reduced-motion: reduce){.slot .bat i{transition:none}}
</style>`);

/* ---------------- 3. render without flicker ---------------- */
let _lastScreen = null;
const __render = render;
render = function () { const y = window.scrollY, same = _lastScreen === S.screen; __render(); _lastScreen = S.screen;
  if (same) { const sc = document.querySelector('#app .screen'); if (sc) sc.classList.add('noanim'); window.scrollTo(0, y); }
  if (S.screen === 'ops') ixMount(); if (S.screen === 'report') ixReport(); injectNotes(); };
function softSide() { const X = curX(), side = document.querySelector('.ops .side'); if (!side) return; const t = document.createElement('div'); t.innerHTML = X.dashFn(); const n = t.firstElementChild; if (!n) return;
  [...side.children].forEach((c, i) => { const d = n.children[i]; if (d && !c.querySelector('img') && c.innerHTML !== d.innerHTML) c.innerHTML = d.innerHTML; }); }
function softView() { const t = document.createElement('div'); t.innerHTML = V[S.screen](); const a = t.querySelector('.view'), b = document.querySelector('.view'); if (a && b && a.innerHTML !== b.innerHTML) b.innerHTML = a.innerHTML; }
const SMOOTH = ['batteryPct', 'storagePct', 'batteryKWh', 'storedGB'];
tickJourney = function () { const j = S.jr; if (!j) return; const X = MX[j.m], st = X.st(); j.t = Math.min(j.h0 + 6, j.t + 0.1 * j.speed);
  const fs = [st.before].concat(j.frames); let p = fs[0], n = null; for (const f of fs) { if (f.t <= j.t + 1e-9) p = f; else { n = f; break; } }
  const L = Object.assign({}, p, { t: j.t }); if (n && n.t > p.t) { const a = (j.t - p.t) / (n.t - p.t); for (const k of SMOOTH) if (typeof p[k] === 'number' && typeof n[k] === 'number') L[k] = p[k] + (n[k] - p[k]) * a; }
  if (j.m === 'fire') { L.critStatus = '…'; L.finalStatus = '…'; } S.live = L; softSide();
  let cap = false; while (j.shown < j.evs.length && j.evs[j.shown].h <= j.t + 1e-9) { const e = j.evs[j.shown++]; j.logHtml += `<div class="${e.cls}">${X.clock(e.h).slice(0, 5)}  ${esc(e.msg)}</div>`; if (/captur/i.test(e.msg)) cap = true; }
  if (cap && j.m !== 'storm') softView();
  const log = document.getElementById('jrLog'); if (log && log.dataset.n !== String(j.shown)) { log.innerHTML = j.logHtml; log.dataset.n = String(j.shown); log.scrollTop = log.scrollHeight; }
  const c = document.getElementById('jrClock'); if (c) c.textContent = X.clock(j.t); const pr = document.getElementById('jrProg'); if (pr) pr.style.width = ((j.t - j.h0) / 6 * 100) + '%';
  const sat = document.getElementById('satOv'); if (sat && X.orbit === 'LEO') sat.style.left = (((j.t * 60) % 100) / 100 * 110 - 8) + '%';
  if (j.m === 'storm') ixStormAt(j.t);
  if (j.t >= j.h0 + 6 - 1e-9) endJourney(); };
const __endJourney = endJourney;
endJourney = function () { const j = S.jr; if (!j) return; const m = j.m, ci = MX[m].st().ci; __endJourney(); if (m === 'storm') ixAfter(ci); };

/* ---------------- 4. Storm Watch: direct controls wired to the engine ---------------- */
const hhmm = t => { const h = Math.floor(t + 1e-9), mm = Math.round((t - h) * 60); return String(h).padStart(2, '0') + ':' + String(mm).padStart(2, '0'); };
const MODES = { full: ['Full', 'every image the camera can take'], one: ['One image', '1 image this hour'], eco: ['Eco', '1 image, 25% less power for camera and radio'], rest: ['Rest', 'no images, radio keeps sending'] };
const MKEYS = Object.keys(MODES);
function onboard(M) { return M.records.filter(r => r.status === 'stored').sort((a, b) => (b.pts / b.sizeGB) - (a.pts / a.sizeGB) || a.t - b.t || a.id - b.id); }
function ixGet() { const o = S.ops, M = o.M, ci = o.ci; o.ix = o.ix || [null, null, null, null]; if (!o.ix[ci]) {
    if (ci === 0) { const p = ENG.trackPoint(M.C, 0, 0); o.ix[0] = { box: ENG.normBox(M.C, { x: p[0], y: p[1], w: 0.5 }) }; }
    if (ci === 1) o.ix[1] = { first: [], drop: [] };
    if (ci === 2) o.ix[2] = { sched: Array(6).fill('full') };
    if (ci === 3) o.ix[3] = { order: onboard(M).map(r => r.id), newFirst: true }; }
  M.ext[ci] = o.ix[ci]; return o.ix[ci]; }
function ixPreview() { const o = S.ops, M = o.M, c = structuredClone(M); c.traceOn = true; c.trace = []; c.events = [];
  c.scn = { anomalySolar: M.scn ? M.scn.anomalySolar : M.C.anomalySolarFactor, link: [], eclipseHour: null, trackDev: 0 };   // the plan: announced fault, storm on the forecast line, no surprises
  const snap = ENG.runChallenge(c, o.ci, o.choice[o.ci]); return { c, snap, d: ENG.derive(c), tr: c.trace }; }
function seenHours(M, box, dev) { const c = { C: M.C, scn: { trackDev: dev } }; let s = 0; for (let h = 0; h < 6; h++) s += ENG.boxScan(c, box, h).seen; return s; }
function setToggles(ci, groups, trailer) { const o = S.ops, ch = chx('storm', ci), c = o.choice[ci];
  return `<div class="ixset">${groups.map(gi => `<div><div class="lab">${ch.groups[gi].lab}</div><div class="sg2">${ch.groups[gi].opts.map(op => `<button class="${c[gi] === op[0] ? 'on' : ''}" data-a="opt" data-g="${gi}" data-v="${op[0]}" title="${esc(op[2])}" aria-pressed="${c[gi] === op[0]}">${op[1]}</button>`).join('')}</div></div>`).join('')}${trailer || ''}</div>`; }
function ixRunBtn(label) { return `<button class="btn blue ixrun" data-a="run">${label || 'Confirm & run 6 hours →'}</button>`; }
function stat(l, v, cls) { return `<div class="ixstat ${cls || ''}"><span>${l}</span><b>${v}</b></div>`; }
function prevLine(p, extra) { const d = p.d, s = p.snap; const miss = s.missed ? `<div class="ixprev" id="ixPrev" role="alert"><b style="color:#ff7a7a">${s.missed} image${s.missed > 1 ? 's' : ''} skipped</b> (${Object.keys(p.c.missedReasons).join(', ')})</div>` : '<div class="ixprev" id="ixPrev" hidden></div>';
  return extra ? `${miss}<div class="ixprev" id="ixPrevX">${extra.replace(/^ · /, '')}</div>` : miss; }
function foot(inline) { return inline ? '' : `${predChips()}<div class="dfoot" style="justify-content:flex-end"><button class="btn blue" data-a="run">Confirm & run 6 hours</button></div>`; }

function ixPanel() { const o = S.ops, M = o.M, ci = o.ci, x = ixGet(), p = ixPreview(); let h = '';
  if (ci === 0) { const b = x.box, sc = ENG.boxScan({ C: M.C, scn: { trackDev: 0 } }, b, 0), gb = M.P.instrument.sizeGB * M.C.res[o.choice[0][0]].size * sc.size, seen = seenHours(M, b, 0);
    h = `<h3>Aim the camera</h3>
    <div class="ixrow">${stat('Storm in view (forecast)', seen.toFixed(1) + ' of 6 h', seen >= 5.5 ? 'good' : seen >= 4 ? 'warn' : 'bad')}${stat('Image detail', Math.round(sc.detail * 100) + '%')}${stat('Each image', gb.toFixed(2) + ' GB')}${stat('Area scanned', Math.round(sc.cover) + '% of the disk')}</div>
    <div class="ixset"><div><div class="lab">Box size (drag to resize)</div><input type="range" id="ixW" min="50" max="100" value="${Math.round(b.w * 100)}" aria-label="Scan box size"> <button class="mini" data-a="ixWhole">Whole disk</button></div></div>${setToggles(0, [0], ixRunBtn())}${prevLine(p)}`; }
  if (ci === 1) { const ob = onboard(M), st = id => x.drop.includes(id) ? 'drop' : x.first.includes(id) ? 'first' : 'keep'; const free = M.P.storage.capGB - ob.filter(r => !x.drop.includes(r.id)).reduce((a, r) => a + r.sizeGB, 0);
    h = `<h3>Sort the data on board</h3><p class="sub">${ob.length ? 'Choose what each waiting image does.' : 'Nothing is waiting: only the settings below are left to decide.'}</p>
    ${ob.length ? `<div class="pklist">${ob.map(r => `<div class="pk"><div class="id">#${r.id}</div><div class="meta">taken <b>${hhmm(r.t)}</b> · <b>${r.pts.toFixed(2)}</b> pts · <b>${r.sizeGB.toFixed(2)}</b> GB</div><div class="sg2">${[['first', 'Send first'], ['keep', 'Keep'], ['drop', 'Discard']].map(k => `<button class="${st(r.id) === k[0] ? 'on ' + k[0] : ''}" data-a="ixPk" data-id="${r.id}" data-v="${k[0]}" aria-pressed="${st(r.id) === k[0]}">${k[1]}</button>`).join('')}</div></div>`).join('')}</div>
    <div class="ixrow">${stat('Free storage now', free.toFixed(2) + ' GB of ' + M.P.storage.capGB)}${stat('Send first', x.first.length)}${stat('Discarded', x.drop.length, x.drop.length ? 'warn' : '')}</div>` : ''}${setToggles(1, [0, 1], ixRunBtn())}${prevLine(p)}`; }
  if (ci === 2) { const solar = Math.round((M.scn ? M.scn.anomalySolar : M.C.anomalySolarFactor) * 100), low = Math.min(...p.tr.map(f => f.batteryPct));
    h = `<h3>Plan the next six hours</h3><p class="sub">The solar array is damaged: only ${solar}% power until 18:00. Click each hour to choose what the satellite does. The bars show the battery at the end of each hour.</p>
    <div class="slots">${x.sched.map((m, i) => { const b = p.tr[i] ? p.tr[i].batteryPct : 0; return `<button class="slot ${m}" data-a="ixSlot" data-i="${i}" title="${MODES[m][1]}" aria-label="${12 + i}:00, ${MODES[m][0]}: ${MODES[m][1]}. Battery after: ${Math.round(b)} percent. Click to change."><small>${12 + i}:00</small><b>${MODES[m][0]}</b><div class="bat"><i class="${b < 15 ? 'low' : b < 40 ? 'mid' : ''}" style="height:${Math.max(4, b * 0.46)}px"></i></div><small>${Math.round(b)}%</small></button>`; }).join('')}</div>
    <div class="ixset"><div><div class="lab">Quick plans</div><button class="mini" data-a="ixPlan" data-v="full">All Full</button> <button class="mini" data-a="ixPlan" data-v="eco">All Eco</button> <button class="mini" data-a="ixPlan" data-v="alt">Image every other hour</button></div></div>
    ${prevLine(p, low < 12 ? ' · <b style="color:#ff7a7a">battery reaches its 10% reserve</b>' : '')}`; }
  if (ci === 3) { const recs = id => p.c.records.find(r => r.id === id), cr = p.d.critical;
    h = `<h3>Emergency downlink</h3><p class="sub">Forecasters need a fresh storm image before 24:00.</p>
    ${x.order.length ? `<div class="pklist">${x.order.map((id, i) => { const r = recs(id), ok = r.status === 'delivered'; return `<div class="pk ${ok ? 'ok' : 'late'}"><div class="id">#${id}</div><div class="meta">taken <b>${hhmm(r.t)}</b> · <b>${r.pts.toFixed(2)}</b> pts · ${ok ? `arrives <b class="eta">${hhmm(r.deliveredAt)}</b> · worth <b>${Math.round(ENG.timelinessFactor(r.deliveredAt - r.t, M.C) * 100)}%</b>` : '<b class="eta">will not arrive by 24:00</b>'}</div><div><button class="mini" data-a="ixMove" data-i="${i}" data-d="-1" aria-label="Move image ${id} up" ${i ? '' : 'disabled'}>▲</button> <button class="mini" data-a="ixMove" data-i="${i}" data-d="1" aria-label="Move image ${id} down" ${i < x.order.length - 1 ? '' : 'disabled'}>▼</button></div></div>`; }).join('')}</div>` : ''}
    <div class="ixset"><div><div class="lab">New storm images</div><div class="sg2"><button class="${x.newFirst ? 'on' : ''}" data-a="ixNew" data-v="1" aria-pressed="${x.newFirst}">Jump the queue</button><button class="${x.newFirst ? '' : 'on'}" data-a="ixNew" data-v="0" aria-pressed="${!x.newFirst}">Wait their turn</button></div></div></div>${setToggles(3, [0, 1], ixRunBtn())}
    ${prevLine(p, ` · critical update <b style="color:${cr ? '#5fe0a0' : '#ff7a7a'}">${cr ? 'arrives ' + hhmm(p.d.criticalRec.deliveredAt) : 'MISSED'}</b>`)}`; }
  return `<div class="glass decision ix" id="ixPanel">${h}${foot(true)}</div>`; }

function trackSvg(M, dev, upto, box) { const C = M.C, X = C.ix, P = k => ENG.trackPoint(C, k, 0), pt = a => (a[0] * 100).toFixed(2) + ',' + (a[1] * 100).toFixed(2);
  const up = [], dn = []; for (let k = 0; k <= 5; k++) { up.push(pt(ENG.trackPoint(C, k, 1.6))); dn.unshift(pt(ENG.trackPoint(C, k, -1.6))); }
  let s = `<polygon points="${up.concat(dn).join(' ')}" fill="#ffffff14" stroke="#ffffff33" stroke-width=".3" vector-effect="non-scaling-stroke"/><polyline points="${[0, 1, 2, 3, 4, 5].map(k => pt(P(k))).join(' ')}" fill="none" stroke="#fff" stroke-width="1.5" stroke-dasharray="5 5" vector-effect="non-scaling-stroke"/>`;
  for (let k = 0; k <= 5; k++) { const a = P(k); s += `<circle cx="${a[0] * 100}" cy="${a[1] * 100}" r=".8" fill="#fff"/><text x="${a[0] * 100}" y="${a[1] * 100 - 2.5}" font-size="2.6" fill="#fff" text-anchor="middle">${String(k).padStart(2, '0')}h</text>`; }
  if (dev != null) { const c = { C, scn: { trackDev: dev } }; let pts = []; for (let k = 0; k <= Math.min(5, upto); k++) { const a = ENG.trackPoint(C, k, dev); pts.push(pt(a)); const seen = box ? ENG.boxScan(c, box, k).seen : 1; s += `<circle cx="${a[0] * 100}" cy="${a[1] * 100}" r="1.3" fill="${seen > 0.66 ? '#5fe0a0' : seen > 0.2 ? '#ffcc66' : '#ff7a7a'}" stroke="#000" stroke-width=".3"/>`; }
    s = s + `<polyline points="${pts.join(' ')}" fill="none" stroke="#ff9d5c" stroke-width="2" vector-effect="non-scaling-stroke"/>`; }
  return `<svg class="ixsvg" viewBox="0 0 100 100" preserveAspectRatio="none" aria-hidden="true">${s}</svg>`; }
function ixStormAt(t) { const M = S.ops.M, el = document.querySelector('.view .storm'); if (!el) return; const k = Math.max(0, Math.min(5, t)), a = ENG.trackPoint(M.C, k, ENG.trackDev(M)); el.style.left = (a[0] * 100) + '%'; el.style.top = (a[1] * 100) + '%'; el.style.transition = 'left .1s linear, top .1s linear'; }
function boxStyle(b) { return `left:${(b.x - b.w / 2) * 100}%;top:${(b.y - b.w / 2) * 100}%;width:${b.w * 100}%;height:${b.w * 100}%`; }
function ixMount() { const o = S.ops, M = o.M, view = document.querySelector('.view'); if (!view || !M) return; const old = view.querySelector('.scanbox'); if (old) old.remove();
  const n = view.querySelector('.note[style*="right"]'); const box = o.ix && o.ix[0] && o.ix[0].box, dev = ENG.trackDev(M);
  if (o.ci === 0 && o.phase === 'choose') { const x = ixGet();
    view.insertAdjacentHTML('beforeend', trackSvg(M, null) + `<div class="ixbox" id="ixBox" tabindex="0" role="slider" aria-label="Scan box. Arrow keys move it, plus and minus resize it." aria-valuetext="${Math.round(x.box.w * 100)} percent size" style="${boxStyle(x.box)}"><span class="lb">Camera scan area</span><span class="hd" id="ixHd"></span></div>`);
    if (n) n.textContent = 'Dashed line = forecast track · shaded = where the storm could go'; ixStormAt(0); }
  else { const done = o.ci > 0 || o.phase === 'result'; if (box) view.insertAdjacentHTML('beforeend', (o.ci === 0 ? trackSvg(M, done ? dev : null, 5, box) : '') + `<div class="ixbox fixed" style="${boxStyle(box)}"></div>`);
    if (n && box) n.textContent = o.ci === 0 && done ? 'Orange = the path the storm really took · dots: green seen, red missed' : 'Dashed box = the area you chose to scan'; else if (n) n.textContent = '';
    ixStormAt(o.ci === 0 && o.phase !== 'result' ? 0 : 5); }
  if (o.phase === 'choose') { const d = document.querySelector('.ops .decision'); if (d) d.outerHTML = ixPanel(); } }
function ixRefresh(light) { const d = document.getElementById('ixPanel'); if (d && light) { const t = document.createElement('div'); t.innerHTML = ixPanel(); ['.ixrow', '#ixPrev'].forEach(q => { const a = t.querySelector(q), b = d.querySelector(q); if (a && b) b.innerHTML = a.innerHTML; }); const r = document.getElementById('ixW'); if (r && document.activeElement !== r) r.value = Math.round(S.ops.ix[0].box.w * 100); }
  else if (d) d.outerHTML = ixPanel(); const b = document.getElementById('ixBox'), x = S.ops.ix && S.ops.ix[0]; if (b && x) { b.style.cssText = boxStyle(x.box); b.setAttribute('aria-valuetext', Math.round(x.box.w * 100) + ' percent size'); } }
function ixSetBox(nb) { const o = S.ops; o.ix[0].box = ENG.normBox(o.M.C, nb); o.M.ext[0] = o.ix[0]; ixRefresh(true); }
let _drag = null;
document.addEventListener('pointerdown', e => { const b = e.target.closest && e.target.closest('#ixBox'); if (!b) return; const r = b.parentNode.getBoundingClientRect(), x = S.ops.ix[0].box;
  _drag = { resize: e.target.id === 'ixHd', px: e.clientX, py: e.clientY, r, b0: Object.assign({}, x) }; b.classList.add('drag'); try { b.setPointerCapture(e.pointerId); } catch (err) {} e.preventDefault(); });
document.addEventListener('pointermove', e => { if (!_drag) return; const d = _drag, dx = (e.clientX - d.px) / d.r.width, dy = (e.clientY - d.py) / d.r.height;
  if (d.resize) { const w = d.b0.w + Math.max(dx, dy) * 2; ixSetBox({ x: d.b0.x, y: d.b0.y, w }); } else ixSetBox({ x: d.b0.x + dx, y: d.b0.y + dy, w: d.b0.w });
  const b = document.getElementById('ixBox'); if (b) b.classList.add('drag'); });
document.addEventListener('pointerup', () => { if (_drag) { _drag = null; const b = document.getElementById('ixBox'); if (b) b.classList.remove('drag'); } });
document.addEventListener('keydown', e => { if (!e.target || e.target.id !== 'ixBox') return; const x = S.ops.ix[0].box, s = 0.02; const m = { ArrowLeft: [-s, 0, 0], ArrowRight: [s, 0, 0], ArrowUp: [0, -s, 0], ArrowDown: [0, s, 0], '+': [0, 0, .04], '=': [0, 0, .04], '-': [0, 0, -.04] }[e.key]; if (!m) return; e.preventDefault(); ixSetBox({ x: x.x + m[0], y: x.y + m[1], w: x.w + m[2] }); const b = document.getElementById('ixBox'); if (b) b.focus(); });
document.addEventListener('input', e => { if (e.target.id === 'ixW') { const x = S.ops.ix[0].box; ixSetBox({ x: x.x, y: x.y, w: +e.target.value / 100 }); } });
document.addEventListener('click', e => { const b = e.target.closest('[data-a]'); if (!b || S.screen !== 'ops' || !S.ops || S.ops.phase !== 'choose') return; const a = b.dataset.a, o = S.ops, x = o.ix && o.ix[o.ci]; if (!x) return;
  if (a === 'ixWhole') ixSetBox({ x: .5, y: .5, w: 1 });
  else if (a === 'ixPk') { const id = +b.dataset.id, v = b.dataset.v; x.first = x.first.filter(i => i !== id); x.drop = x.drop.filter(i => i !== id); if (v === 'first') x.first.push(id); if (v === 'drop') x.drop.push(id); ixRefresh(); }
  else if (a === 'ixSlot') { const i = +b.dataset.i; x.sched[i] = MKEYS[(MKEYS.indexOf(x.sched[i]) + 1) % MKEYS.length]; ixRefresh(); const s = document.querySelector(`[data-a="ixSlot"][data-i="${i}"]`); if (s) s.focus(); }
  else if (a === 'ixPlan') { const v = b.dataset.v; x.sched = v === 'alt' ? ['one', 'rest', 'one', 'rest', 'one', 'rest'] : Array(6).fill(v); ixRefresh(); }
  else if (a === 'ixMove') { const i = +b.dataset.i, j = i + (+b.dataset.d); if (j >= 0 && j < x.order.length) { [x.order[i], x.order[j]] = [x.order[j], x.order[i]]; ixRefresh(); } }
  else if (a === 'ixNew') { x.newFirst = b.dataset.v === '1'; ixRefresh(); } });

/* what actually happened, in one or two sentences */
function ixAfter(ci) { const o = S.ops, M = o.M, x = o.ix && o.ix[ci], sn = M.chSnapshots[ci]; if (!x || !sn) return; let t = '';
  if (ci === 0) { const dev = ENG.trackDev(M), f = seenHours(M, x.box, 0), a = seenHours(M, x.box, dev); t = `<b>What happened:</b> the storm ${dev === 0 ? 'stayed on the forecast line' : `drifted ${dev > 0 ? 'south' : 'north'} of the forecast line`}. Your box had it in view for <b>${a.toFixed(1)} of 6 hours</b> (the forecast said ${f.toFixed(1)}). The orange line on the map is the real path.`; }
  if (ci === 1) t = `<b>What happened:</b> ${sn.delivered.length} image${sn.delivered.length === 1 ? '' : 's'} reached Earth and ${sn.captured.length} new one${sn.captured.length === 1 ? ' was' : 's were'} taken. ${x.drop.length ? `You discarded ${x.drop.length}: that data is gone for good. ` : ''}${sn.missed ? `${sn.missed} image${sn.missed > 1 ? 's were' : ' was'} skipped because there was no room or no power.` : 'No image was skipped.'}`;
  if (ci === 2) { const fr = M.trace.slice(-6), low = fr.reduce((a, f) => f.batteryPct < a.batteryPct ? f : a, fr[0]); t = `<b>What happened:</b> the battery was lowest at ${hhmm(low.t)} (<b>${Math.round(low.batteryPct)}%</b>). ${sn.captured.length} image${sn.captured.length === 1 ? ' was' : 's were'} taken${sn.missed ? `, ${sn.missed} skipped at the 10% reserve` : ''}. What is left in the battery is what you start the emergency downlink with.`; }
  if (ci === 3) { const d = sn.after, left = M.records.filter(r => r.lostReason === 'undelivered').length; t = `<b>What happened:</b> the critical update ${d.critical ? `arrived at <b>${hhmm(d.criticalRec.deliveredAt)}</b>` : '<b>did not arrive</b> before 24:00'}. ${left ? `${left} image${left > 1 ? 's were' : ' was'} still on board when time ran out.` : 'Nothing was left on board.'}`; }
  const L = o.log[ci], ch = chx('storm', ci), lab = gi => (ch.groups[gi].opts.find(p => p[0] === o.choice[ci][gi]) || [])[1];
  if (L) { if (ci === 0) { const sc = ENG.boxScan(M, x.box, 0); L.choices = `${lab(0)} + scan box ${Math.round(sc.cover)}% of the disk`; L.good = String(L.good).replace(/\(scan coverage[^)]*\)/, `(area scanned ${Math.round(sc.cover)}%, box detail ${Math.round(sc.detail * 100)}%)`); }
    if (ci === 1) L.choices = `${lab(0)} + ${lab(1)}${x.first.length || x.drop.length ? ` + ${x.first.length} sent first, ${x.drop.length} discarded` : ''}`;
    if (ci === 2) L.choices = x.sched.map(m => MODES[m][0]).join(' · ');
    if (ci === 3) L.choices = `${lab(0)} + ${lab(1)} + new images ${x.newFirst ? 'jump the queue' : 'wait their turn'}`; }
  o.notes = o.notes || {}; (o.notes[ci] = o.notes[ci] || []).unshift(t); render(); }

/* report: "change one thing" for the direct controls */
function ixReport() { const o = S.ops, M = o && o.M; if (!M || !o.ix) return; const h2 = [...document.querySelectorAll('.panel h2')].find(e => /Change one decision/.test(e.textContent)); if (!h2) return;
  const base = ENG.score(M).total, d = M.design, dec = o.choice.map(c => c.slice()), ext = () => JSON.parse(JSON.stringify(M.ext)), C = M.C, dev = ENG.trackDev(M), rows = [];
  const add = (label, mut) => { const e = ext(), dd = dec.map(c => c.slice()); if (mut(e, dd) === false) return; const r = ENG.runFull(d, dd, 'v35', S.scn.storm, e).s; rows.push([label, r.total - base, r.total, r.outcome]); };
  if (o.ix[0]) { add('Challenge 1: scan the whole disk', e => { e[0] = { box: { x: .5, y: .5, w: 1 } }; }); add('Challenge 1: same box size, centred on the real storm path', e => { const a = ENG.trackPoint(C, 2.5, dev); e[0] = { box: { x: a[0], y: a[1], w: e[0].box.w } }; }); }
  add('Challenge 1: other image quality', (e, dd) => { dd[0][0] = dd[0][0] === 'std' ? 'high' : 'std'; });
  if (o.ix[1]) add('Challenge 2: no manual sorting', e => { if (!e[1].first.length && !e[1].drop.length) return false; e[1] = null; });
  add('Challenge 2: other image quality', (e, dd) => { dd[1][0] = dd[1][0] === 'std' ? 'high' : 'std'; }); add('Challenge 2: other full-storage rule', (e, dd) => { dd[1][1] = dd[1][1] === 'keep' ? 'prio' : 'keep'; });
  if (o.ix[2]) [['Take Images every period', Array(6).fill('full')], ['Save Power every period', Array(6).fill('rest')], ['Take Images only in the Late period', ['rest', 'rest', 'rest', 'rest', 'full', 'full']]].forEach(k => add('Challenge 3: ' + k[0], e => { if (e[2].sched.join() === k[1].join()) return false; e[2] = { sched: k[1] }; }));
  if (o.ix[3]) add(`Challenge 4: new images ${o.ix[3].newFirst ? 'wait their turn' : 'jump the queue'}`, e => { e[3].newFirst = !e[3].newFirst; });
  add('Challenge 4: other downlink speed', (e, dd) => { dd[3][0] = dd[3][0] === 'std' ? 'fast' : 'std'; }); add('Challenge 4: other power mode', (e, dd) => { dd[3][1] = dd[3][1] === 'full' ? 'eco' : 'full'; });
  const best = rows.slice().sort((a, b) => b[1] - a[1])[0];
  h2.parentNode.innerHTML = `<h2 style="font-size:26px;margin-bottom:6px">Change one thing</h2><p class="muted" style="font-size:12.5px">Each row replays the whole mission with the same satellite and the same Mission Code, changing only one of your moves. ${best && best[1] > 0 ? `Biggest gain: ${best[0]} (+${best[1]}).` : 'No single change would have scored higher.'}</p>
   <table class="xtab"><tr><th>What changes</th><th>Score</th><th>Outcome</th></tr>${rows.map(r => `<tr><td>${r[0]}</td><td><b>${r[2]}</b> <span style="color:${r[1] > 0 ? '#5fe0a0' : r[1] < 0 ? '#ff7a7a' : '#8fa3c4'}">(${r[1] > 0 ? '+' : ''}${r[1]})</span></td><td>${r[3]}</td></tr>`).join('')}</table>
   <p class="muted" style="font-size:12px;margin-top:8px">Sorting choices in challenges 2 and 4 are replayed by image number.</p>`; }

/* ---------------- 5. background music (original, generated in the browser; no audio files) ---------------- */
const Music = { ctx: null, on: false, timer: null, step: 0,
  start() { if (this.on) return; try { this.ctx = this.ctx || new (window.AudioContext || window.webkitAudioContext)(); } catch (e) { return; } const c = this.ctx; c.resume && c.resume();
    this.out = c.createGain(); this.out.gain.value = 0; this.out.gain.linearRampToValueAtTime(0.9, c.currentTime + 2); const lp = c.createBiquadFilter(); lp.type = 'lowpass'; lp.frequency.value = 1800; this.out.connect(lp); lp.connect(c.destination);
    this.on = true; this.step = 0; this.next = c.currentTime + 0.1; this.timer = setInterval(() => this.sched(), 200); },
  stop() { if (!this.on) return; this.on = false; clearInterval(this.timer); const c = this.ctx, o = this.out; o.gain.cancelScheduledValues(c.currentTime); o.gain.setValueAtTime(o.gain.value, c.currentTime); o.gain.linearRampToValueAtTime(0, c.currentTime + 0.6); setTimeout(() => { try { o.disconnect(); } catch (e) {} }, 800); },
  tone(f, t, dur, vol, type) { const c = this.ctx, o = c.createOscillator(), g = c.createGain(); o.type = type; o.frequency.value = f; g.gain.setValueAtTime(0, t); g.gain.linearRampToValueAtTime(vol, t + Math.min(0.4, dur * 0.3)); g.gain.exponentialRampToValueAtTime(0.0001, t + dur); o.connect(g); g.connect(this.out); o.start(t); o.stop(t + dur + 0.05); },
  sched() { const c = this.ctx, beat = 60 / 76, CH = [[220, 261.63, 329.63, 392], [174.61, 220, 261.63, 329.63], [130.81, 196, 261.63, 329.63], [196, 246.94, 293.66, 392]], AR = [0, 2, 1, 3, 2, 1, 3, 2];
    while (this.next < c.currentTime + 0.6) { const s = this.step, ch = CH[Math.floor(s / 8) % 4], t = this.next;
      if (s % 8 === 0) { ch.forEach(f => this.tone(f / 2, t, beat * 4.2, 0.035, 'sine')); this.tone(ch[0] / 4, t, beat * 4.2, 0.05, 'triangle'); }
      this.tone(ch[AR[s % 8]] * 2, t, beat * 0.9, s % 2 ? 0.012 : 0.02, 'triangle');
      this.next += beat / 2; this.step++; } } };
S.music = true;
document.body.insertAdjacentHTML('beforeend', '<button id="musicBtn" aria-pressed="true">♪ Music: on</button>');
function musicUi() { const b = document.getElementById('musicBtn'); b.textContent = '♪ Music: ' + (S.music ? 'on' : 'off'); b.setAttribute('aria-pressed', String(S.music)); }
document.addEventListener('click', e => { if (e.target.id === 'musicBtn') { S.music = !S.music; S.music ? Music.start() : Music.stop(); musicUi(); return; } if (S.music && !Music.on) Music.start(); }, true);
